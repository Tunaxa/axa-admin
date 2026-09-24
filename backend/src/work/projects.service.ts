import { Injectable, NotFoundException } from '@nestjs/common';
import type { ActivityEvent } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityService } from './activity.service.js';

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  workspaceId: string;
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  /** Projects in the caller's tenant. */
  list(organizationId: string): Promise<ProjectSummary[]> {
    return this.prisma.project.findMany({
      where: { organizationId },
      select: { id: true, name: true, status: true, workspaceId: true },
      orderBy: { name: 'asc' },
    });
  }

  /** The project's activity feed, newest first. */
  async activityFor(
    organizationId: string,
    projectId: string,
  ): Promise<ActivityEvent[]> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    // Reported as missing rather than forbidden, so the response does not
    // confirm that a project id exists in another tenant.
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.activity.listForProject(organizationId, projectId);
  }
}
