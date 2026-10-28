import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ActivityEvent, Prisma } from '@prisma/client';

import {
  type AccessScope,
  PermissionsService,
} from '../auth/permissions.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityService } from './activity.service.js';
import type {
  CreateProjectDto,
  UpdateProjectDto,
} from './dto/update-project.dto.js';
import { WorkspacesService } from './workspaces.service.js';

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  workspaceId: string;
  departmentId: string | null;
  completionPercent: number;
}

const SELECT = {
  id: true,
  name: true,
  description: true,
  status: true,
  workspaceId: true,
  departmentId: true,
  completionPercent: true,
} satisfies Prisma.ProjectSelect;

/**
 * Projects.
 *
 * A project belongs to a department. The CEO sees and edits every one; a
 * manager only those of their own department; everybody else reads their
 * department's projects.
 */
@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly permissions: PermissionsService,
    private readonly workspaces: WorkspacesService,
  ) {}

  async list(
    organizationId: string,
    actorId: string,
  ): Promise<ProjectSummary[]> {
    const scope = await this.permissions.scope(organizationId, actorId);

    if (!scope.seeAll && !scope.departmentId) {
      return [];
    }

    return this.prisma.project.findMany({
      where: {
        organizationId,
        ...(scope.seeAll ? {} : { departmentId: scope.departmentId }),
      },
      select: SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async create(
    organizationId: string,
    actorId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectSummary> {
    const scope = await this.permissions.scope(organizationId, actorId);

    // A manager always works in their own department; the CEO has to say which.
    const departmentId = scope.seeAll
      ? (dto.departmentId ?? null)
      : scope.departmentId;

    if (!departmentId) {
      throw new BadRequestException(
        'A project needs a department: pick one for it',
      );
    }

    await this.assertDepartmentInTenant(organizationId, departmentId);

    if (
      !scope.seeAll &&
      dto.departmentId &&
      dto.departmentId !== departmentId
    ) {
      throw new ForbiddenException(
        'You can only create projects in your department',
      );
    }

    const workspace = await this.workspaces.ensureDefault(organizationId);

    return this.prisma.project.create({
      data: {
        organizationId,
        workspaceId: workspace.id,
        departmentId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      },
      select: SELECT,
    });
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectSummary> {
    await this.assertCanManage(organizationId, actorId, id);

    const data: Prisma.ProjectUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.completionPercent !== undefined) {
      data.completionPercent = dto.completionPercent;
    }

    return this.prisma.project.update({
      where: { id },
      data,
      select: SELECT,
    });
  }

  /** Deleting a project keeps its issues; they just lose the project. */
  async remove(
    organizationId: string,
    actorId: string,
    id: string,
  ): Promise<void> {
    await this.assertCanManage(organizationId, actorId, id);

    await this.prisma.project.delete({ where: { id } });
  }

  /** The project's activity feed, newest first. */
  async activityFor(
    organizationId: string,
    actorId: string,
    projectId: string,
  ): Promise<ActivityEvent[]> {
    await this.assertCanManage(organizationId, actorId, projectId, false);

    return this.activity.listForProject(organizationId, projectId);
  }

  /**
   * Finds a project the caller is allowed to touch.
   *
   * Reported as missing rather than forbidden, so the response does not confirm
   * that a project in another department (or tenant) exists.
   */
  private async assertCanManage(
    organizationId: string,
    actorId: string,
    id: string,
    _write = true,
  ): Promise<void> {
    const scope = await this.permissions.scope(organizationId, actorId);
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
      select: { id: true, departmentId: true },
    });

    if (!project || !this.canAccess(scope, project.departmentId)) {
      throw new NotFoundException('Project not found');
    }
  }

  private canAccess(scope: AccessScope, departmentId: string | null): boolean {
    if (scope.seeAll) return true;

    return scope.departmentId !== null && scope.departmentId === departmentId;
  }

  private async assertDepartmentInTenant(
    organizationId: string,
    departmentId: string,
  ): Promise<void> {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId },
      select: { id: true },
    });

    if (!department) {
      throw new BadRequestException(
        'Department not found in this organization',
      );
    }
  }
}
