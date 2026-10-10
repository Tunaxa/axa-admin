import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import type { ListDevProfilesQuery } from './dto/list-dev-profiles.query.js';
import type { UpsertDevProfileDto } from './dto/upsert-dev-profile.dto.js';

/** A profile, with enough of the member attached to render a directory card. */
export interface DevProfileView {
  stack: string[];
  ownershipArea: string | null;
  slackHandle: string | null;
  githubHandle: string | null;
  phone: string | null;
  updatedAt: Date;
  member: {
    id: string;
    role: Role;
    user: { id: string; name: string; email: string };
  };
}

/** Beyond this a stack is a list of everything, which answers nothing. */
const MAX_STACK = 30;

@Injectable()
export class DevProfilesService {
  /** Shared shape, so the list and the single read cannot drift apart. */
  private static readonly SELECT = {
    stack: true,
    ownershipArea: true,
    slackHandle: true,
    githubHandle: true,
    phone: true,
    updatedAt: true,
    teamMember: {
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    query: ListDevProfilesQuery,
  ): Promise<DevProfileView[]> {
    const where: Prisma.DevProfileWhereInput = { organizationId };

    if (query.stack) {
      // `has` is a containment test against the array, which is what the GIN
      // index serves. Normalised first, so a search for `React` finds `react`.
      where.stack = { has: normaliseOne(query.stack) };
    }

    const profiles = await this.prisma.devProfile.findMany({
      where,
      select: DevProfilesService.SELECT,
      orderBy: { teamMember: { user: { name: 'asc' } } },
    });

    return profiles.map(toView);
  }

  async findOne(
    organizationId: string,
    teamMemberId: string,
  ): Promise<DevProfileView> {
    const profile = await this.prisma.devProfile.findFirst({
      where: { teamMemberId, organizationId },
      select: DevProfilesService.SELECT,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return toView(profile);
  }

  /**
   * Writes somebody's profile — their own.
   *
   * Self-only: a profile is what a person says about themselves, and the
   * permission guard works per route rather than per record, so "an owner may
   * also edit yours" is a rule there is nowhere to put yet. See the README.
   */
  async upsert(
    organizationId: string,
    callerUserId: string,
    teamMemberId: string,
    dto: UpsertDevProfileDto,
  ): Promise<DevProfileView> {
    const member = await this.prisma.teamMember.findFirst({
      where: { id: teamMemberId, organizationId },
      select: { id: true, userId: true },
    });

    // A member in another tenant is reported as missing rather than
    // forbidden, so the response does not confirm that the id is real.
    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    if (member.userId !== callerUserId) {
      throw new ForbiddenException('You can only edit your own profile');
    }

    const data = {
      stack: normalise(dto.stack ?? []),
      ownershipArea: blankToNull(dto.ownershipArea),
      slackHandle: blankToNull(dto.slackHandle),
      githubHandle: blankToNull(dto.githubHandle),
      phone: blankToNull(dto.phone),
    };

    const profile = await this.prisma.devProfile.upsert({
      where: { teamMemberId },
      create: { organizationId, teamMemberId, ...data },
      update: data,
      select: DevProfilesService.SELECT,
    });

    return toView(profile);
  }
}

function toView(profile: {
  stack: string[];
  ownershipArea: string | null;
  slackHandle: string | null;
  githubHandle: string | null;
  phone: string | null;
  updatedAt: Date;
  teamMember: {
    id: string;
    role: Role;
    user: { id: string; name: string; email: string };
  };
}): DevProfileView {
  const { teamMember, ...rest } = profile;

  return { ...rest, member: teamMember };
}

/**
 * Trims, lower-cases and de-duplicates a stack.
 *
 * Free text is the right shape for this — a controlled vocabulary needs a list
 * nobody has agreed on — but without normalising, `React`, `react` and
 * ` react ` become three different skills and the filter finds one of them.
 */
function normalise(stack: string[]): string[] {
  const seen = new Set<string>();

  for (const entry of stack) {
    const value = normaliseOne(entry);

    if (value) {
      seen.add(value);
    }
  }

  return [...seen].slice(0, MAX_STACK);
}

function normaliseOne(value: string): string {
  return value.trim().toLowerCase();
}

/** An empty string is someone clearing a field, which is a null. */
function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}
