import { Injectable } from '@nestjs/common';

import { PermissionsService } from '../auth/permissions.service.js';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  /**
   * Who the caller may pick, for pickers such as the assignee dropdown.
   *
   * The CEO sees everyone; a manager their department; anybody else only
   * themselves, since they only work on their own tasks.
   */
  async list(organizationId: string, actorId: string): Promise<UserSummary[]> {
    const scope = await this.permissions.scope(organizationId, actorId);

    const where = scope.seeAll
      ? { organizationId }
      : scope.isManager && scope.departmentId
        ? {
            organizationId,
            teamMember: { is: { departmentId: scope.departmentId } },
          }
        : { organizationId, id: actorId };

    return this.prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }
}
