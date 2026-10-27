import { Injectable, NotFoundException } from '@nestjs/common';
import type { ActivityEvent, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityService } from './activity.service.js';
import type { UpdateProjectDto } from './dto/update-project.dto.js';

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  workspaceId: string;
  completionPercent: number;
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
      select: {
        id: true,
        name: true,
        status: true,
        workspaceId: true,
        completionPercent: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectSummary> {
    const existing = await this.prisma.project.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Project not found');

    const data: Prisma.ProjectUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.completionPercent !== undefined)
      data.completionPercent = dto.completionPercent;

    return this.prisma.project.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        status: true,
        workspaceId: true,
        completionPercent: true,
      },
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
