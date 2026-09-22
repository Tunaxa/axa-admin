import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Issue, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateIssueDto } from './dto/create-issue.dto.js';
import type { ListIssuesQuery } from './dto/list-issues.query.js';
import type { UpdateIssueDto } from './dto/update-issue.dto.js';

/**
 * Issue reads and writes.
 *
 * Every query is filtered by `organizationId`, taken from the verified token
 * rather than from the request body, so a caller cannot reach another tenant's
 * issues by guessing ids.
 */
@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateIssueDto): Promise<Issue> {
    await this.assertWorkspaceInTenant(organizationId, dto.workspaceId);

    if (dto.assigneeId) {
      await this.assertUserInTenant(organizationId, dto.assigneeId);
    }

    if (dto.projectId) {
      await this.assertProjectInWorkspace(
        organizationId,
        dto.workspaceId,
        dto.projectId,
      );
    }

    return this.prisma.issue.create({
      data: {
        organizationId,
        workspaceId: dto.workspaceId,
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        projectId: dto.projectId,
        app: dto.app,
      },
    });
  }

  async list(organizationId: string, query: ListIssuesQuery): Promise<Issue[]> {
    const where: Prisma.IssueWhereInput = { organizationId };

    if (query.assigneeId) {
      where.assigneeId = query.assigneeId;
    }

    if (query.app) {
      where.app = query.app;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    return this.prisma.issue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateIssueDto,
  ): Promise<Issue> {
    const issue = await this.findInTenant(organizationId, id);

    if (dto.assigneeId) {
      await this.assertUserInTenant(organizationId, dto.assigneeId);
    }

    if (dto.projectId) {
      await this.assertProjectInWorkspace(
        organizationId,
        issue.workspaceId,
        dto.projectId,
      );
    }

    return this.prisma.issue.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findInTenant(organizationId, id);

    await this.prisma.issue.delete({ where: { id } });
  }

  /**
   * Looks an issue up inside the caller's tenant.
   *
   * An issue that exists in another tenant is reported as missing rather than
   * forbidden, so the response does not confirm that the id is real.
   */
  private async findInTenant(
    organizationId: string,
    id: string,
  ): Promise<Issue> {
    const issue = await this.prisma.issue.findFirst({
      where: { id, organizationId },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    return issue;
  }

  private async assertWorkspaceInTenant(
    organizationId: string,
    workspaceId: string,
  ) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, organizationId },
      select: { id: true },
    });

    if (!workspace) {
      throw new BadRequestException('Workspace not found in this organization');
    }
  }

  private async assertUserInTenant(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Assignee not found in this organization');
    }
  }

  private async assertProjectInWorkspace(
    organizationId: string,
    workspaceId: string,
    projectId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, workspaceId },
      select: { id: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found in this workspace');
    }
  }
}
