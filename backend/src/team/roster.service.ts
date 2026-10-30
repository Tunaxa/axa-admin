import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AppKey, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateTeamMemberDto } from './dto/create-team-member.dto.js';
import type { InviteMemberDto } from './dto/invite-member.dto.js';
import type { UpdateTeamMemberDto } from './dto/update-team-member.dto.js';

const BCRYPT_ROUNDS = 12;

/** A roster row: the membership, who it belongs to, and what they own. */
export interface RosterEntry {
  id: string;
  role: Role;
  user: { id: string; name: string; email: string };
  ownerships: { app: AppKey; role: Role }[];
  createdAt: Date;
}

/**
 * The team roster.
 *
 * Every query is filtered by `organizationId` from the verified token, so a
 * caller cannot reach another tenant's roster by guessing ids.
 */
@Injectable()
export class RosterService {
  /** Shared shape so list and single reads cannot drift apart. */
  private static readonly SELECT = {
    id: true,
    role: true,
    createdAt: true,
    user: { select: { id: true, name: true, email: true } },
    ownerships: { select: { app: true, role: true }, orderBy: { app: 'asc' } },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string): Promise<RosterEntry[]> {
    return this.prisma.teamMember.findMany({
      where: { organizationId },
      select: RosterService.SELECT,
      orderBy: { user: { name: 'asc' } },
    });
  }

  async add(
    organizationId: string,
    dto: CreateTeamMemberDto,
  ): Promise<RosterEntry> {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, organizationId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('User not found in this organization');
    }

    // `userId` is unique, so the database would reject this anyway — catching
    // it here turns a 500 into a 409 that says what happened.
    const existing = await this.prisma.teamMember.findUnique({
      where: { userId: dto.userId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('That user is already on the team');
    }

    return this.prisma.teamMember.create({
      data: { organizationId, userId: dto.userId, role: dto.role },
      select: RosterService.SELECT,
    });
  }

  /**
   * One-shot invite: create a user, add them to the roster and grant the
   * per-app role in a single transaction. Everything or nothing — a
   * half-created user is worse than none.
   */
  async invite(
    organizationId: string,
    dto: InviteMemberDto,
  ): Promise<RosterEntry> {
    const existing = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email: dto.email } },
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
        data: {
          organizationId,
          email: dto.email,
          name: dto.name,
          passwordHash,
        },
        select: { id: true },
      });
      const member = await tx.teamMember.create({
        data: { organizationId, userId: user.id, role: dto.role },
        select: { id: true },
      });
      if (dto.team) {
        await tx.appOwnership.create({
          data: {
            organizationId,
            teamMemberId: member.id,
            app: dto.team,
            role: dto.role,
          },
        });
      }
      return member.id;
    });

    return this.prisma.teamMember.findUniqueOrThrow({
      where: { id: memberId },
      select: RosterService.SELECT,
    });
  }

  async updateRole(
    organizationId: string,
    id: string,
    dto: UpdateTeamMemberDto,
  ): Promise<RosterEntry> {
    await this.findInTenant(organizationId, id);

    return this.prisma.teamMember.update({
      where: { id },
      data: { role: dto.role },
      select: RosterService.SELECT,
    });
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findInTenant(organizationId, id);

    // Their app ownerships go too — the schema cascades them.
    await this.prisma.teamMember.delete({ where: { id } });
  }

  /**
   * A membership in another tenant is reported as missing rather than
   * forbidden, so the response does not confirm that the id is real.
   */
  private async findInTenant(
    organizationId: string,
    id: string,
  ): Promise<void> {
    const member = await this.prisma.teamMember.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }
  }
}
