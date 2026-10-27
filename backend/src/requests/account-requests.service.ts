import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountRequestStatus,
  type AccountRequest,
  type Prisma,
} from '@prisma/client';

import { PermissionsService } from '../auth/permissions.service.js';
import { StripeService } from '../billing/stripe.service.js';
import { TeamsService } from '../integrations/teams.service.js';
import { EventsService } from '../events/events.service.js';
import { MailService, type RequestOutcome } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

import type { ApproveRequestDto } from './dto/approve-request.dto.js';
import type { CreateRequestDto } from './dto/create-request.dto.js';
import type { DecideRequestDto } from './dto/decide-request.dto.js';
import type { ListRequestsQuery } from './dto/list-requests.query.js';
import type { ProvisionRequestDto } from './dto/provision-request.dto.js';
import type { UpdateRequestDto } from './dto/update-request.dto.js';
import { canTransition, isOpen, TRANSITIONS } from './request-transitions.js';

const BCRYPT_ROUNDS = 12;

/** Shape returned by the provisioning endpoint — admins need the created user. */
export interface ProvisionedAccount {
  request: AccountRequest;
  user: { id: string; email: string; name: string; role: string };
}

@Injectable()
export class AccountRequestsService {
  private readonly logger = new Logger(AccountRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly teams: TeamsService,
    private readonly mail: MailService,
    private readonly events: EventsService,
    private readonly permissions: PermissionsService,
  ) {}

  create(
    organizationId: string,
    raisedById: string,
    dto: CreateRequestDto,
  ): Promise<AccountRequest> {
    return this.prisma.accountRequest.create({
      data: {
        organizationId,
        raisedById,
        app: dto.app,
        requesterEmail: dto.requesterEmail,
        requesterName: dto.requesterName,
        note: dto.note,
      },
    });
  }

  list(
    organizationId: string,
    query: ListRequestsQuery,
  ): Promise<AccountRequest[]> {
    const where: Prisma.AccountRequestWhereInput = { organizationId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.app) {
      where.app = query.app;
    }

    // Oldest first: a queue people work through, not a feed they scroll.
    return this.prisma.accountRequest.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string): Promise<AccountRequest> {
    const request = await this.prisma.accountRequest.findFirst({
      where: { id, organizationId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return request;
  }

  /**
   * Approves a request and hands back somewhere to pay.
   *
   * **The checkout session is created first, and the approval is recorded
   * only if that worked.** The other order would leave an approved request
   * with no way to pay whenever Stripe was unreachable — which looks like a
   * finished decision and is not one. A failed attempt leaves the request
   * pending, so it can simply be approved again.
   */
  async approve(
    organizationId: string,
    deciderId: string,
    id: string,
    dto: ApproveRequestDto,
  ): Promise<AccountRequest> {
    const request = await this.assertOpen(organizationId, id, deciderId);

    const session = await this.stripe.createCheckoutSession(
      organizationId,
      deciderId,
      {
        app: request.app,
        priceId: dto.priceId,
        customerEmail: request.requesterEmail,
        // The request's own id, so approving twice returns the first session
        // rather than a second one somebody could also pay.
        referenceId: request.id,
        mode: dto.mode,
      },
    );

    const approved = await this.prisma.accountRequest.update({
      where: { id: request.id },
      data: {
        status: AccountRequestStatus.approved,
        decidedById: deciderId,
        decidedAt: new Date(),
        decisionNote: dto.note ?? null,
        checkoutSessionId: session.id,
        checkoutUrl: session.url,
      },
    });

    this.announce(approved, 'approved');

    return approved;
  }

  /** Refuses a request, with a reason the requester will be told. */
  async reject(
    organizationId: string,
    deciderId: string,
    id: string,
    dto: DecideRequestDto,
  ): Promise<AccountRequest> {
    return this.decide(
      organizationId,
      deciderId,
      id,
      AccountRequestStatus.rejected,
      dto,
    );
  }

  /**
   * Sends a request back for more detail.
   *
   * Still open, but no longer waiting on the approver — which is why it is a
   * status rather than a comment. "How long do approvals take" counts the
   * time an approver actually held it.
   */
  async needsMoreInfo(
    organizationId: string,
    deciderId: string,
    id: string,
    dto: DecideRequestDto,
  ): Promise<AccountRequest> {
    return this.decide(
      organizationId,
      deciderId,
      id,
      AccountRequestStatus.needs_more_info,
      dto,
    );
  }

  private async decide(
    organizationId: string,
    deciderId: string,
    id: string,
    status: AccountRequestStatus,
    dto: DecideRequestDto,
  ): Promise<AccountRequest> {
    const request = await this.assertOpen(organizationId, id, deciderId);

    const decided = await this.prisma.accountRequest.update({
      where: { id: request.id },
      data: {
        status,
        decidedById: deciderId,
        decidedAt: new Date(),
        decisionNote: dto.note,
      },
    });

    this.announce(decided, status);

    return decided;
  }

  /**
   * Edits a request, and re-submits it if it was sent back.
   *
   * Only the person who raised it, and only while it is open: once a decision
   * is final, changing what was asked for would quietly rewrite what somebody
   * approved.
   *
   * Editing a `needs_more_info` request moves it back to `pending`, which is
   * the whole point of that status — the detail has been supplied, so the
   * approver has it again. The previous note is kept, so the requester can
   * still see what was asked of them.
   */
  async update(
    organizationId: string,
    editorId: string,
    id: string,
    dto: UpdateRequestDto,
  ): Promise<AccountRequest> {
    const request = await this.findOne(organizationId, id);

    if (!isOpen(request.status)) {
      throw new ConflictException(
        `A ${request.status} request cannot be changed`,
      );
    }

    if (request.raisedById !== editorId) {
      throw new ForbiddenException('You can only edit your own requests');
    }

    const resubmitting =
      request.status === AccountRequestStatus.needs_more_info;

    return this.prisma.accountRequest.update({
      where: { id: request.id },
      data: {
        ...(dto.requesterEmail ? { requesterEmail: dto.requesterEmail } : {}),
        ...(dto.requesterName ? { requesterName: dto.requesterName } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(resubmitting ? { status: AccountRequestStatus.pending } : {}),
      },
    });
  }

  /**
   * Takes a request back.
   *
   * Marked `withdrawn` rather than deleted. A request is part of what the
   * pipeline did, and a dashboard that counts requests must not have rows
   * vanish from under it — "we withdrew four" and "four never happened" are
   * different facts.
   */
  async withdraw(
    organizationId: string,
    withdrawerId: string,
    id: string,
  ): Promise<AccountRequest> {
    const request = await this.findOne(organizationId, id);

    if (!canTransition(request.status, AccountRequestStatus.withdrawn)) {
      throw new ConflictException(
        `A ${request.status} request cannot be withdrawn`,
      );
    }

    if (request.raisedById !== withdrawerId) {
      throw new ForbiddenException('You can only withdraw your own requests');
    }

    return this.prisma.accountRequest.update({
      where: { id: request.id },
      data: { status: AccountRequestStatus.withdrawn },
    });
  }

  /** Where this request can go from where it is. */
  async transitions(
    organizationId: string,
    id: string,
  ): Promise<{
    status: AccountRequestStatus;
    allowed: readonly AccountRequestStatus[];
  }> {
    const request = await this.findOne(organizationId, id);

    return { status: request.status, allowed: TRANSITIONS[request.status] };
  }

  /**
   * A request can only be decided while it is open.
   *
   * `needs_more_info` counts as open: the whole point is that it comes back.
   * An already approved request is a `409` rather than a silent second
   * approval, because the first one may already have been paid.
   */
  private async assertOpen(
    organizationId: string,
    id: string,
    deciderId?: string,
  ): Promise<AccountRequest> {
    const request = await this.findOne(organizationId, id);

    // The guard checked that this person may decide *something*. Whether they
    // may decide this one depends on the application it is for, which only
    // the record knows — so the per-application rule is enforced here.
    if (deciderId) {
      const allowed = await this.permissions.can(
        organizationId,
        deciderId,
        'requests:decide',
        request.app,
      );

      if (!allowed) {
        throw new ForbiddenException(
          `You cannot decide ${request.app} requests`,
        );
      }
    }

    // One table decides this, so a status added later cannot be decidable by
    // accident just because nobody updated a condition here.
    if (!isOpen(request.status)) {
      throw new ConflictException(`This request is already ${request.status}`);
    }

    return request;
  }

  /**
   * Tells Teams a decision was made.
   *
   * Fire and forget, like the assignment notifications: a channel that is
   * down must not fail a decision that is already recorded.
   */
  private announce(request: AccountRequest, status: string): void {
    this.teams.notifyAccountRequestDecided({
      app: request.app,
      requesterName: request.requesterName,
      requesterEmail: request.requesterEmail,
      status,
      note: request.decisionNote,
    });

    // The person who asked is told as well as the channel. Teams hears that a
    // decision happened; the requester is the one who has to act on it.
    this.mail.notifyRequester(
      status as RequestOutcome,
      request.requesterEmail,
      {
        requesterName: request.requesterName,
        app: request.app,
        note: request.decisionNote,
        checkoutUrl: request.checkoutUrl,
      },
    );

    // Announced to whatever else is running: a dashboard open in a browser,
    // another API instance, a future WebSocket gateway. Nothing listens yet,
    // and nothing has to.
    this.events.publish('request.decided', request.organizationId, {
      organizationId: request.organizationId,
      requestId: request.id,
      app: request.app,
      status,
      requesterEmail: request.requesterEmail,
    });

    this.logger.log(
      `Request ${request.id} (${request.app}) ${status} for ${request.requesterEmail}`,
    );
  }

  /**
   * Approves a request by creating an internal user account for the
   * requester — password set by the admin, role attributed and an
   * `AppOwnership` row scoping it to the team (= AXA app).
   *
   * All writes run inside one Prisma transaction so a half-provisioned user
   * cannot be left behind; the request is marked approved only if everything
   * else landed.
   */
  async provision(
    organizationId: string,
    deciderId: string,
    id: string,
    dto: ProvisionRequestDto,
  ): Promise<ProvisionedAccount> {
    const request = await this.assertOpen(organizationId, id, deciderId);

    const existing = await this.prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email: request.requesterEmail,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A user with that email already exists in this organization',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const team = dto.team ?? request.app;
    const displayName = dto.name?.trim() || request.requesterName;

    const [createdUser, approved] = await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            organizationId,
            email: request.requesterEmail,
            name: displayName,
            passwordHash,
          },
          select: { id: true, email: true, name: true },
        });

        const member = await tx.teamMember.create({
          data: {
            organizationId,
            userId: user.id,
            role: dto.role,
          },
        });

        await tx.appOwnership.create({
          data: {
            organizationId,
            teamMemberId: member.id,
            app: team,
            role: dto.role,
          },
        });

        const decided = await tx.accountRequest.update({
          where: { id: request.id },
          data: {
            status: AccountRequestStatus.approved,
            decidedById: deciderId,
            decidedAt: new Date(),
            decisionNote:
              dto.decisionNote ??
              `Account provisioned (${dto.role} on ${team})`,
          },
        });

        return [user, decided];
      },
    );

    this.announce(approved, 'approved');

    return {
      request: approved,
      user: { ...createdUser, role: dto.role },
    };
  }
}
