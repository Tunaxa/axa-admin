import type { ActivityEventId, UserId, WorkspaceScopedEntity } from './common.js';

/**
 * Event kinds rendered by the Activity Feed.
 *
 * The feed is part of the Phase 1 scope because the chronological, real-time
 * record of what changed is central to the Linear-like experience.
 */
export const ACTIVITY_EVENT_TYPES = [
  'issue.created',
  'issue.status_changed',
  'issue.assigned',
  'issue.priority_changed',
  'issue.commented',
  'issue.archived',
  'project.created',
  'project.status_changed',
  'cycle.started',
  'cycle.completed',
  'daily_report.submitted',
  'account_request.submitted',
  'account_request.decided',
  'github.pull_request_merged',
  'member.role_changed',
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

/** The entity an activity event refers to. */
export interface ActivitySubject {
  type: 'issue' | 'project' | 'cycle' | 'milestone' | 'daily_report' | 'account_request' | 'member';
  id: string;
  /** Cached label so the feed renders without extra lookups. */
  label: string;
}

/**
 * A single immutable entry in the activity feed.
 *
 * Events are append-only: corrections are expressed as new events rather than
 * edits, which keeps the feed usable as an audit trail.
 */
export interface ActivityEvent extends WorkspaceScopedEntity {
  type: ActivityEventType;
  subject: ActivitySubject;
  /** The member who caused the event; `null` for automated/system events. */
  actorUserId: UserId | null;
  /** Type-specific payload, e.g. `{ from: 'todo', to: 'in_progress' }`. */
  payload: Record<string, unknown>;
  /** Set when this event was produced by replacing or superseding another. */
  supersedesEventId: ActivityEventId | null;
}
