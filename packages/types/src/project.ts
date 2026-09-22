import type { AppKey } from './app.js';
import type {
  IsoDate,
  MilestoneId,
  ProjectId,
  SoftDeletable,
  UserId,
  WorkspaceScopedEntity,
} from './common.js';

/** A body of work inside a workspace that groups issues. */
export interface Project extends WorkspaceScopedEntity, SoftDeletable {
  key: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  /** Application this project primarily delivers against, when applicable. */
  app: AppKey | null;
  leadUserId: UserId | null;
  startDate: IsoDate | null;
  targetDate: IsoDate | null;
}

export type ProjectStatus =
  'backlog' | 'planned' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

/** A time-boxed iteration, equivalent to a sprint. */
export interface Cycle extends WorkspaceScopedEntity {
  /** Monotonically increasing number within the workspace. */
  number: number;
  name: string | null;
  startsOn: IsoDate;
  endsOn: IsoDate;
  status: CycleStatus;
}

export type CycleStatus = 'upcoming' | 'active' | 'completed';

/** A roadmap milestone that issues and projects can be aligned to. */
export interface Milestone extends WorkspaceScopedEntity {
  name: string;
  description: string | null;
  targetDate: IsoDate | null;
  status: MilestoneStatus;
  /** Optional parent, so phases can contain milestones. */
  parentMilestoneId: MilestoneId | null;
  projectIds: ProjectId[];
}

export type MilestoneStatus = 'planned' | 'in_progress' | 'reached' | 'missed';
