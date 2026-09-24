import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

/**
 * A sign-in identity, as pickers need it. `passwordHash` is never selected.
 *
 * Distinct from the `TeamMember` model, which is a person's place on the team;
 * this is just the user record.
 */
export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Everyone in the caller's tenant, for pickers such as the assignee dropdown. */
  list(organizationId: string): Promise<UserSummary[]> {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }
}
