import type { IsoDate, IsoDateTime, IssueId, UserId, WorkspaceScopedEntity } from './common.js';

/**
 * A structured daily update, replacing ad hoc chat messages.
 *
 * Each report answers the same three questions and links back to Work issues
 * wherever the developer can attribute the update to concrete tickets.
 */
export interface DailyReport extends WorkspaceScopedEntity {
  authorUserId: UserId;
  /** The working day the report covers; unique per author and workspace. */
  reportDate: IsoDate;
  /** What was shipped today. */
  shipped: string;
  /** What is currently blocked, empty when nothing is blocked. */
  blockers: string;
  /** What the author is working on next. */
  nextUp: string;
  /** Issues referenced by this report, used for cross-linking in the feed. */
  linkedIssueIds: IssueId[];
  status: DailyReportStatus;
  submittedAt: IsoDateTime | null;
}

export type DailyReportStatus = 'draft' | 'submitted' | 'missed';

/** Aggregated view used for the team leader digest. */
export interface DailyReportDigest {
  reportDate: IsoDate;
  submitted: DailyReport[];
  /** Members who owed a report for this date but did not submit one. */
  missingUserIds: UserId[];
}
