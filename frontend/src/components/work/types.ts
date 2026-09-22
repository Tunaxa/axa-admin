/**
 * Issue shape as the board renders it.
 *
 * These mirror the backend's `issue_status`, `issue_priority` and `app_key`
 * enums. They are declared here rather than imported because the frontend and
 * backend are independent projects; when the board is wired to `GET /issues`,
 * this is the contract to check against.
 */

export const ISSUE_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;

export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const APP_KEYS = ['axa_admin', 'axacrm', 'axapass', 'website'] as const;

export type AppKey = (typeof APP_KEYS)[number];

export interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  app: AppKey | null;
  assigneeId: string | null;
}

/** A container issues belong to. */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

/** A person who can be assigned an issue. */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
}
