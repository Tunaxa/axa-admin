import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

/** The fields the roster exposes. `passwordHash` is never selected. */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Everyone in the caller's tenant, for pickers such as the assignee dropdown. */
  list(organizationId: string): Promise<TeamMember[]> {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }
}
