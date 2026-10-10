import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IssueStatus } from '@prisma/client';
import type { ActivityEvent, Issue, Prisma } from '@prisma/client';

import { TeamsService } from '../integrations/teams.service.js';
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
  ) {}

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
          assigneeId: dto.assigneeId,
          projectId: dto.projectId,
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

  async update(
    organizationId: string,
    actorId: string,
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
    const issue = await this.findInTenant(organizationId, id);

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
    id: string,
  ): Promise<ActivityEvent[]> {
    await this.findInTenant(organizationId, id);

    return this.activity.listForIssue(organizationId, id);
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
