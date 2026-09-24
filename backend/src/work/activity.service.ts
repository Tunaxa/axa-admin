import { Injectable } from '@nestjs/common';
import type { ActivityEvent, ActivityEventType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

/** The shape of `payload` for each event type. */
export interface ActivityPayloads {
  issue_status_changed: { from: string; to: string };
  issue_assigned: { from: string | null; to: string | null };
  issue_commented: { body: string };
}

export interface RecordActivityInput<
  T extends ActivityEventType = ActivityEventType,
> {
  organizationId: string;
  workspaceId: string;
  issueId: string;
  type: T;
  /** Null for events raised by automation rather than a person. */
  actorId: string | null;
  payload: T extends keyof ActivityPayloads ? ActivityPayloads[T] : never;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends an event.
   *
   * Takes an optional transaction client so an event can be written in the
   * same transaction as the change it describes — otherwise a failure between
   * the two would leave the feed disagreeing with the issue.
   */
  record(
    input: RecordActivityInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ActivityEvent> {
    const client = tx ?? this.prisma;

    return client.activityEvent.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        issueId: input.issueId,
        type: input.type,
        actorId: input.actorId,
        payload: input.payload,
      },
    });
  }

  /**
   * The feed for one project, newest first.
   *
   * Scoped through the issue's current `projectId` rather than a column on the
   * event: an issue moved between projects therefore takes its history with
   * it. Recording the project on the event would freeze where each event
   * happened, which is a different and equally defensible reading — this one
   * answers "what has happened in this project", which is what a project feed
   * is read for.
   */
  listForProject(
    organizationId: string,
    projectId: string,
  ): Promise<ActivityEvent[]> {
    return this.prisma.activityEvent.findMany({
      where: { organizationId, issue: { projectId } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** The feed for one issue, newest first. */
  listForIssue(
    organizationId: string,
    issueId: string,
  ): Promise<ActivityEvent[]> {
    return this.prisma.activityEvent.findMany({
      where: { organizationId, issueId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
