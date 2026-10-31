import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AppKey, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import {
  type AccessScope,
  PermissionsService,
} from '../auth/permissions.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { InviteMemberDto } from './dto/invite-member.dto.js';
import type { UpdateTeamMemberDto } from './dto/update-team-member.dto.js';

const BCRYPT_ROUNDS = 12;

/**
 * The roles somebody can be invited into, or moved between, from the roster.
 *
 * Managers are named from the Departments page and the CEO sits above every
 * department, so neither is something a roster edit may hand out.
 */
const MEMBER_ROLES: readonly Role[] = ['developer', 'designer', 'viewer'];

/** A roster row: the membership, who it belongs to, and what they own. */
export interface RosterEntry {
  id: string;
  role: Role;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  user: { id: string; name: string; email: string };
  ownerships: { app: AppKey; role: Role }[];
  createdAt: Date;
}

/**
 * The team roster.
 *
 * Every query is filtered by `organizationId` from the verified token, so a
 * caller cannot reach another tenant's roster by guessing ids, and by the
 * caller's department, so a manager cannot reach another department's people.
 */
@Injectable()
export class RosterService {
  /** Shared shape so list and single reads cannot drift apart. */
  private static readonly SELECT = {
    id: true,
    role: true,
    departmentId: true,
    createdAt: true,
    department: { select: { id: true, name: true } },
    user: { select: { id: true, name: true, email: true } },
    ownerships: { select: { app: true, role: true }, orderBy: { app: 'asc' } },
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly permissions: PermissionsService,
  ) {}

  async list(organizationId: string, actorId: string): Promise<RosterEntry[]> {
    const scope = await this.permissions.scope(organizationId, actorId);

    if (!scope.seeAll && !scope.departmentId) {
      return [];
    }

    return this.prisma.teamMember.findMany({
      where: {
        organizationId,
        ...(scope.seeAll ? {} : { departmentId: scope.departmentId }),
      },
      select: RosterService.SELECT,
      orderBy: { user: { name: 'asc' } },
    });
  }

  /**
   * One-shot invite: create a user, add them to the roster inside a department
   * in a single transaction. Everything or nothing — a half-created user is
   * worse than none.
   *
   * The CEO picks the department; a manager always invites into their own.
   */
  async invite(
    organizationId: string,
    actorId: string,
    dto: InviteMemberDto,
  ): Promise<RosterEntry> {
    const scope = await this.permissions.scope(organizationId, actorId);

    if (!MEMBER_ROLES.includes(dto.role)) {
      throw new BadRequestException(
        'Les managers se créent depuis la page Départements',
      );
    }

    const departmentId = scope.seeAll ? dto.departmentId : scope.departmentId;

    if (!departmentId) {
      throw new BadRequestException('Choose a department for the new member');
    }

    if (
      !scope.seeAll &&
      dto.departmentId &&
      dto.departmentId !== departmentId
    ) {
      throw new ForbiddenException(
        'You can only add people to your department',
      );
    }

    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId },
      select: { id: true, name: true },
    });

    if (!department) {
      throw new BadRequestException(
        'Department not found in this organization',
      );
    }

    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email } },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A user with that email already exists in this organization',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const memberId = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { organizationId, email, name: dto.name.trim(), passwordHash },
        select: { id: true },
      });

      const member = await tx.teamMember.create({
        data: {
          organizationId,
          userId: user.id,
          role: dto.role,
          departmentId: department.id,
        },
        select: { id: true },
      });

      return member.id;
    });

    const entry = await this.prisma.teamMember.findUniqueOrThrow({
      where: { id: memberId },
      select: RosterService.SELECT,
    });

    // Welcome the new member. Not inside the transaction: notifications are
    // non-critical and must never roll the account creation back.
    void this.notifications.push({
      organizationId,
      recipientId: entry.user.id,
      actorId,
      type: 'team_joined',
      title: `Bienvenue dans ${department.name}`,
      body: `Tu as rejoint le département en tant que ${entry.role}.`,
      link: '/',
    });

    return entry;
  }

  async updateRole(
    organizationId: string,
    actorId: string,
    id: string,
    dto: UpdateTeamMemberDto,
  ): Promise<RosterEntry> {
    const scope = await this.permissions.scope(organizationId, actorId);
    await this.findManageable(organizationId, scope, id);

    if (!MEMBER_ROLES.includes(dto.role)) {
      throw new BadRequestException(
        'Only developer, designer or viewer can be set from the roster',
      );
    }

    return this.prisma.teamMember.update({
      where: { id },
      data: { role: dto.role },
      select: RosterService.SELECT,
    });
  }

  async remove(
    organizationId: string,
    actorId: string,
    id: string,
  ): Promise<void> {
    const scope = await this.permissions.scope(organizationId, actorId);
    const member = await this.findManageable(organizationId, scope, id);

    // Drop the account with the membership, so a person who left cannot keep
    // signing in. If the account is still referenced (reports they wrote), the
    // membership alone goes and the sign-in no longer resolves to anything.
    try {
      await this.prisma.user.delete({ where: { id: member.userId } });
    } catch {
      await this.prisma.teamMember.delete({ where: { id } });
    }
  }

  /**
   * Finds a member the caller is allowed to change.
   *
   * The CEO may change anyone below the manager line; a manager only the
   * ordinary members of their own department. Managers and the CEO are left
   * alone: they are replaced from the Departments page.
   * A member elsewhere is reported as missing rather than forbidden, so the
   * response does not confirm that the id is real.
   */
  private async findManageable(
    organizationId: string,
    scope: AccessScope,
    id: string,
  ): Promise<{ id: string; userId: string; role: Role }> {
    const member = await this.prisma.teamMember.findFirst({
      where: { id, organizationId },
      select: { id: true, userId: true, role: true, departmentId: true },
    });

    const visible =
      member &&
      (scope.seeAll ||
        (scope.departmentId !== null &&
          member.departmentId === scope.departmentId));

    if (!member || !visible) {
      throw new NotFoundException('Team member not found');
    }

    if (!MEMBER_ROLES.includes(member.role)) {
      throw new ForbiddenException(
        'Managers are changed from the Departments page',
      );
    }

    return member;
  }
}
