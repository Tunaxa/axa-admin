import type { Issue, IssuePriority, IssueStatus } from './types';

export const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  none: 'No priority',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

/** Colour carries emphasis, never meaning on its own — the label is always present. */
export const PRIORITY_STYLES: Record<IssuePriority, string> = {
  none: 'text-muted-foreground',
  low: 'text-muted-foreground',
  medium: 'text-foreground',
  high: 'text-orange-600 dark:text-orange-400',
  urgent: 'text-red-600 dark:text-red-400',
};

export const APP_LABELS: Record<NonNullable<Issue['app']>, string> = {
  axa_admin: 'axa-admin',
  axacrm: 'axacrm',
  axapass: 'axapass',
  website: 'website',
};

/** Display name for an issue's assignee, or `null` when unassigned. */
export function assigneeNameFor(
  assigneeId: string | null,
  members: { id: string; name: string }[],
): string | null {
  if (!assigneeId) {
    return null;
  }

  return members.find((member) => member.id === assigneeId)?.name ?? null;
}
