import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountRequestStatus,
  type AccountRequest,
  type Prisma,
} from '@prisma/client';

import { StripeService } from '../billing/stripe.service.js';
import { TeamsService } from '../integrations/teams.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ApproveRequestDto } from './dto/approve-request.dto.js';
import type { CreateRequestDto } from './dto/create-request.dto.js';
import type { DecideRequestDto } from './dto/decide-request.dto.js';
import type { ListRequestsQuery } from './dto/list-requests.query.js';

@Injectable()
export class AccountRequestsService {
  private readonly logger = new Logger(AccountRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly teams: TeamsService,
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
    const request = await this.assertOpen(organizationId, id);

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
    const request = await this.assertOpen(organizationId, id);

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
   * A request can only be decided while it is open.
   *
   * `needs_more_info` counts as open: the whole point is that it comes back.
   * An already approved request is a `409` rather than a silent second
   * approval, because the first one may already have been paid.
   */
  private async assertOpen(
    organizationId: string,
    id: string,
  ): Promise<AccountRequest> {
    const request = await this.findOne(organizationId, id);

    if (
      request.status === AccountRequestStatus.approved ||
      request.status === AccountRequestStatus.rejected
    ) {
      throw new ConflictException(`This request was already ${request.status}`);
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

    this.logger.log(
      `Request ${request.id} (${request.app}) ${status} for ${request.requesterEmail}`,
    );
  }
}
