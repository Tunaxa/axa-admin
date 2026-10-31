import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IssueStatus } from '@prisma/client';
import type { ActivityEvent, Issue, Prisma } from '@prisma/client';

import {
  type AccessScope,
  PermissionsService,
} from '../auth/permissions.service.js';
import { TeamsService } from '../integrations/teams.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityService } from './activity.service.js';
import { parseIssueKey, parseIssueKeys } from './issue-key.js';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly teams: TeamsService,
    private readonly notifications: NotificationsService,
    private readonly permissions: PermissionsService,
  ) {}

  async create(
    organizationId: string,
    actorId: string,
    dto: CreateIssueDto,
  ): Promise<Issue> {
    const scope = await this.permissions.scope(organizationId, actorId);

    await this.assertWorkspaceInTenant(organizationId, dto.workspaceId);

    let projectDepartmentId: string | null = null;

    if (dto.projectId) {
      const project = await this.assertProjectInWorkspace(
        organizationId,
        dto.workspaceId,
        dto.projectId,
      );
      projectDepartmentId = project.departmentId;
    }

    // Which department the work belongs to: the project's, else the CEO's
    // explicit choice, else the creator's own.
    const departmentId =
      projectDepartmentId ??
      (scope.seeAll ? (dto.departmentId ?? null) : scope.departmentId);

    if (!scope.seeAll) {
      if (!scope.departmentId) {
        throw new ForbiddenException('You do not belong to any department');
      }

      if (departmentId !== scope.departmentId) {
        throw new ForbiddenException('That project is outside your department');
      }
    }

    // Somebody who is not a manager works on their own tasks: whatever they
    // create is theirs.
    const assigneeId =
      dto.assigneeId ?? (scope.seeAll || scope.isManager ? undefined : actorId);

    if (!scope.seeAll && !scope.isManager && assigneeId !== actorId) {
      throw new ForbiddenException(
        'Only a manager can assign a task to somebody else',
      );
    }

    if (assigneeId) {
      await this.assertAssigneeInDepartment(
        organizationId,
        assigneeId,
        departmentId,
      );
    }

    // The key and the issue are written in one transaction, and the counter is
    // bumped with an atomic increment rather than a read-then-write: the row
    // lock that takes is what stops two simultaneous creates both being handed
    // AXA-124.
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.update({
        where: { id: organizationId },
        data: { issueCounter: { increment: 1 } },
        select: { issuePrefix: true, issueCounter: true },
      });

      return tx.issue.create({
        data: {
          organizationId,
          workspaceId: dto.workspaceId,
          key: `${organization.issuePrefix}-${organization.issueCounter}`,
          title: dto.title,
          description: dto.description,
          status: dto.status,
          priority: dto.priority,
          assigneeId,
          projectId: dto.projectId,
          departmentId,
          app: dto.app,
          // An issue created straight into `done` was closed now.
          closedAt: dto.status === IssueStatus.done ? new Date() : null,
        },
      });
    });
  }

  /**
   * Looks an issue up by its human-readable key, as a branch name carries it.
   *
   * The key is normalised, so `axa-123` and `AXA-007` both find `AXA-7`. An
   * unparseable reference is a `400` rather than a `404`: `banana` is not a
   * key that happens to be missing.
   */
  async findByKey(organizationId: string, key: string): Promise<Issue> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { issuePrefix: true },
    });

    const parsed = organization
      ? parseIssueKey(key, organization.issuePrefix)
      : null;

    if (!parsed) {
      throw new BadRequestException(
        `Not an issue key for this organization: ${key}`,
      );
    }

    const issue = await this.prisma.issue.findFirst({
      where: { organizationId, key: parsed },
    });

    if (!issue) {
      throw new NotFoundException(`No issue ${parsed}`);
    }

    return issue;
  }

  /**
   * The issues a branch name or a pull request title refers to.
   *
   * Keys that parse but match nothing are dropped rather than reported: a
   * branch may well mention an issue from before this tenant's history, and
   * that is not an error anybody can act on.
   */
  async findByText(organizationId: string, text: string): Promise<Issue[]> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { issuePrefix: true },
    });

    if (!organization) {
      return [];
    }

    const keys = parseIssueKeys(text, organization.issuePrefix);

    if (keys.length === 0) {
      return [];
    }

    return this.prisma.issue.findMany({
      where: { organizationId, key: { in: keys } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async list(
    organizationId: string,
    actorId: string,
    query: ListIssuesQuery,
  ): Promise<Issue[]> {
    const scope = await this.permissions.scope(organizationId, actorId);
    const where: Prisma.IssueWhereInput = { organizationId };

    if (!scope.seeAll) {
      // Nobody outside a department sees anything.
      if (!scope.departmentId) {
        return [];
      }

      where.departmentId = scope.departmentId;

      // Members see their own tasks only; managers see the whole department.
      if (!scope.isManager) {
        where.assigneeId = actorId;
      }
    }

    if (query.assigneeId && (scope.seeAll || scope.isManager)) {
      where.assigneeId = query.assigneeId;
    }

    if (query.departmentId && scope.seeAll) {
      where.departmentId = query.departmentId;
    }

    if (query.app) {
      where.app = query.app;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.closedAfter || query.closedBefore) {
      where.closedAt = {
        ...(query.closedAfter ? { gte: new Date(query.closedAfter) } : {}),
        // Exclusive, so a day and the next one do not both claim midnight.
        ...(query.closedBefore ? { lt: new Date(query.closedBefore) } : {}),
      };
    }

    return this.prisma.issue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Keeps only the issues this person is allowed to see. */
  async filterVisible(
    organizationId: string,
    actorId: string,
    issues: Issue[],
  ): Promise<Issue[]> {
    const scope = await this.permissions.scope(organizationId, actorId);

    return issues.filter((issue) => {
      if (scope.seeAll) return true;

      return (
        scope.departmentId !== null &&
        issue.departmentId === scope.departmentId &&
        (scope.isManager || issue.assigneeId === actorId)
      );
    });
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    dto: UpdateIssueDto,
  ): Promise<Issue> {
    const scope = await this.permissions.scope(organizationId, actorId);
    const issue = await this.findInTenant(organizationId, id);
    this.assertCanAccess(scope, issue, actorId);

    if (dto.assigneeId) {
      if (!scope.seeAll && !scope.isManager && dto.assigneeId !== actorId) {
        throw new ForbiddenException(
          'Only a manager can assign a task to somebody else',
        );
      }

      await this.assertAssigneeInDepartment(
        organizationId,
        dto.assigneeId,
        issue.departmentId,
      );
    }

    if (dto.projectId) {
      const project = await this.assertProjectInWorkspace(
        organizationId,
        issue.workspaceId,
        dto.projectId,
      );

      if (issue.departmentId && project.departmentId !== issue.departmentId) {
        throw new ForbiddenException('That project is outside the department');
      }
    }

    var data: Prisma.IssueUncheckedUpdateInput = { ...dto };

    // `closedAt` is maintained here rather than by the caller, so the board's
    // drag-and-drop and the detail panel record it without knowing about it.
    // Re-sending the same status leaves it alone: it marks the move into
    // `done`, not the last time someone confirmed the issue was done.
    if (dto.status && dto.status !== issue.status) {
      data.closedAt = dto.status === IssueStatus.done ? new Date() : null;
    }

    // `closedAt` is maintained here rather than by the caller, so the board's
    // drag-and-drop and the detail panel record it without knowing about it.
    // Re-sending the same status leaves it alone: it marks the move into
    // `done`, not the last time someone confirmed the issue was done.
    if (dto.status && dto.status !== issue.status) {
      data.closedAt = dto.status === IssueStatus.done ? new Date() : null;
    }

    // The update and the events it produces go in one transaction: a feed that
    // disagrees with the issue it describes is worse than no feed.
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.issue.update({ where: { id }, data });

      const base = {
        organizationId,
        workspaceId: issue.workspaceId,
        issueId: issue.id,
        actorId,
      };

      if (dto.status !== undefined && dto.status !== issue.status) {
        await this.activity.record(
          {
            ...base,
            type: 'issue_status_changed',
            payload: { from: issue.status, to: dto.status },
          },
          tx,
        );
      }

      if (dto.assigneeId !== undefined && dto.assigneeId !== issue.assigneeId) {
        await this.activity.record(
          {
            ...base,
            type: 'issue_assigned',
            payload: { from: issue.assigneeId, to: dto.assigneeId ?? null },
          },
          tx,
        );
      }

      return updated;
    });

    // After the transaction, never inside it: a webhook is a network call, and
    // holding a database transaction open across one is how a slow third party
    // becomes a database problem.
    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== null &&
      dto.assigneeId !== issue.assigneeId
    ) {
      await this.announceAssignment(organizationId, actorId, updated);
      // Tell the new assignee their inbox got something.
      await this.notifications.push({
        organizationId,
        recipientId: dto.assigneeId,
        actorId,
        type: 'task_assigned',
        title: `Nouvelle tâche assignée : ${updated.title}`,
        body: updated.key,
        link: `/?issue=${updated.id}`,
      });
    }

    // Tell the assignee when their task's status moves — nothing worse than
    // discovering by chance that a review was finished.
    if (
      dto.status !== undefined &&
      dto.status !== issue.status &&
      updated.assigneeId &&
      updated.assigneeId !== actorId
    ) {
      await this.notifications.push({
        organizationId,
        recipientId: updated.assigneeId,
        actorId,
        type: 'task_status_changed',
        title: `Statut mis à jour : ${updated.title}`,
        body: `${issue.status} → ${updated.status}`,
        link: `/?issue=${updated.id}`,
      });
    }

    // Tell the department manager when one of their people moves a task, so
    // progress reaches them without having to open the board.
    if (
      dto.status !== undefined &&
      dto.status !== issue.status &&
      updated.departmentId
    ) {
      const department = await this.prisma.department.findUnique({
        where: { id: updated.departmentId },
        select: { managerId: true },
      });

      if (department?.managerId && department.managerId !== actorId) {
        await this.notifications.push({
          organizationId,
          recipientId: department.managerId,
          actorId,
          type: 'task_status_changed',
          title: `Avancement : ${updated.title}`,
          body: `${issue.status} -> ${updated.status}`,
          link: `/?issue=${updated.id}`,
        });
      }
    }

    return updated;
  }

  /**
   * Tells Teams an issue changed hands.
   *
   * Reads the two names the card needs and hands over a finished payload, so
   * the integration stays a transport that knows nothing about this schema.
   * Its own failures are swallowed there; the lookup's are swallowed here, for
   * the same reason — an assignment that worked must not report an error.
   */
  private async announceAssignment(
    organizationId: string,
    actorId: string,
    issue: Issue,
  ): Promise<void> {
    if (!this.teams.enabled || !issue.assigneeId) {
      return;
    }

    try {
      const people = await this.prisma.user.findMany({
        where: { organizationId, id: { in: [actorId, issue.assigneeId] } },
        select: { id: true, name: true },
      });

      const nameOf = (id: string) =>
        people.find((person) => person.id === id)?.name ?? 'Someone';

      this.teams.notifyIssueAssigned({
        issueTitle: issue.title,
        assigneeName: nameOf(issue.assigneeId),
        actorName: nameOf(actorId),
        status: issue.status,
        priority: issue.priority,
        app: issue.app,
      });
    } catch {
      // Already logged by Nest's exception layer if it matters; what must not
      // happen is this failing the update that has already been committed.
    }
  }

  /**
   * Records a comment on an issue.
   *
   * Comments live in the activity feed for now: there is no separate comment
   * table, so they cannot be edited or deleted. See the README.
   */
  async comment(
    organizationId: string,
    actorId: string,
    id: string,
    body: string,
  ): Promise<ActivityEvent> {
    const scope = await this.permissions.scope(organizationId, actorId);
    const issue = await this.findInTenant(organizationId, id);
    this.assertCanAccess(scope, issue, actorId);

    return this.activity.record({
      organizationId,
      workspaceId: issue.workspaceId,
      issueId: issue.id,
      type: 'issue_commented',
      actorId,
      payload: { body },
    });
  }

  /** The activity feed for one issue, newest first. */
  async activityFor(
    organizationId: string,
    actorId: string,
    id: string,
  ): Promise<ActivityEvent[]> {
    const scope = await this.permissions.scope(organizationId, actorId);
    const issue = await this.findInTenant(organizationId, id);
    this.assertCanAccess(scope, issue, actorId);

    return this.activity.listForIssue(organizationId, id);
  }

  async remove(
    organizationId: string,
    actorId: string,
    id: string,
  ): Promise<void> {
    const scope = await this.permissions.scope(organizationId, actorId);
    const issue = await this.findInTenant(organizationId, id);
    this.assertCanAccess(scope, issue, actorId);

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
      select: { id: true, departmentId: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found in this workspace');
    }

    return project;
  }

  /**
   * Whether this person may touch an issue.
   *
   * The CEO may touch any; a manager, any in their department; anyone else
   * only what is assigned to them. Reported as missing rather than forbidden,
   * so the response does not confirm that an issue in another department
   * exists.
   */
  private assertCanAccess(
    scope: AccessScope,
    issue: Issue,
    actorId: string,
  ): void {
    if (scope.seeAll) return;

    const sameDepartment =
      scope.departmentId !== null && issue.departmentId === scope.departmentId;

    if (sameDepartment && (scope.isManager || issue.assigneeId === actorId)) {
      return;
    }

    throw new NotFoundException('Issue not found');
  }

  /** The assignee has to work in the department the issue belongs to. */
  private async assertAssigneeInDepartment(
    organizationId: string,
    assigneeId: string,
    departmentId: string | null,
  ): Promise<void> {
    const member = await this.prisma.teamMember.findFirst({
      where: { organizationId, userId: assigneeId },
      select: { role: true, departmentId: true },
    });

    if (!member) {
      throw new BadRequestException('Assignee not found in this organization');
    }

    if (member.role === 'owner') return;

    if (departmentId && member.departmentId !== departmentId) {
      throw new BadRequestException(
        'Assignee does not belong to the department of the issue',
      );
    }
  }
}
