import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
}

const SELECT = { id: true, name: true, slug: true } as const;

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Workspaces in the caller's tenant, for pickers and issue creation.
   *
   * A tenant always has at least one: departments and projects hang off a
   * workspace, and a company that has just been created has none yet, so the
   * first read makes the default.
   */
  async list(organizationId: string): Promise<WorkspaceSummary[]> {
    await this.ensureDefault(organizationId);

    return this.prisma.workspace.findMany({
      where: { organizationId },
      select: SELECT,
      orderBy: { name: 'asc' },
    });
  }

  /** The tenant's first workspace, created on demand. */
  async ensureDefault(organizationId: string): Promise<WorkspaceSummary> {
    const existing = await this.prisma.workspace.findFirst({
      where: { organizationId },
      select: SELECT,
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.workspace.upsert({
      where: { organizationId_slug: { organizationId, slug: 'general' } },
      create: { organizationId, slug: 'general', name: 'General' },
      update: {},
      select: SELECT,
    });
  }
}
