import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
}

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Workspaces in the caller's tenant, for pickers and issue creation. */
  list(organizationId: string): Promise<WorkspaceSummary[]> {
    return this.prisma.workspace.findMany({
      where: { organizationId },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }
}
