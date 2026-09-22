import type {
  CycleId,
  IsoDate,
  IsoDateTime,
  IssueId,
  MilestoneId,
  ProjectId,
  SoftDeletable,
  UserId,
  WorkspaceScopedEntity,
} from './common.js';

/** Workflow states for an issue in the Work module. */
export const ISSUE_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/** Priority ordering matches the keyboard-first Linear-style convention. */
export const ISSUE_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;

export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export interface Issue extends WorkspaceScopedEntity, SoftDeletable {
  /** Human-readable key built from the workspace prefix, e.g. `ADM-142`. */
  key: string;
  title: string;
  /** Markdown body. */
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  /** Relative ordering within a board column. */
  boardRank: string;
  estimate: number | null;
  projectId: ProjectId | null;
  cycleId: CycleId | null;
  milestoneId: MilestoneId | null;
  parentIssueId: IssueId | null;
  assigneeUserId: UserId | null;
  creatorUserId: UserId;
  labelIds: string[];
  dueOn: IsoDate | null;
  startedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  /** Populated by the GitHub integration in a later phase. */
  github: IssueGithubLink | null;
}

/** Link between an axa-admin issue and its GitHub counterparts. */
export interface IssueGithubLink {
  repository: string;
  issueNumber: number | null;
  pullRequestNumbers: number[];
  branchName: string | null;
  lastSyncedAt: IsoDateTime | null;
}

export interface IssueLabel extends WorkspaceScopedEntity {
  name: string;
  /** Hex colour, e.g. `#5E6AD2`. */
  color: string;
  description: string | null;
}

export interface IssueComment extends WorkspaceScopedEntity {
  issueId: IssueId;
  authorUserId: UserId;
  /** Markdown body. */
  body: string;
  editedAt: IsoDateTime | null;
}
