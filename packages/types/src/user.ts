import type { AppKey } from './app.js';
import type { BaseEntity, IsoDateTime, SoftDeletable } from './common.js';

/**
 * A person who can sign in to axa-admin.
 *
 * The user record is deliberately tenant-agnostic: tenant-specific data lives
 * on `Membership`, so the same identity can be shared across organizations and,
 * later, across the AXA ecosystem should shared auth/SSO be adopted.
 */
export interface User extends BaseEntity, SoftDeletable {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  /** Free-form job title shown on the team roster and developer profiles. */
  title: string | null;
  timezone: string | null;
  lastSeenAt: IsoDateTime | null;
}

/** Team-roster metadata for a member, surfaced by the Team module. */
export interface TeamMemberProfile {
  userId: string;
  /** Applications this member is an owner or main contributor for. */
  ownedApps: AppKey[];
  /** Planned availability in hours per week, used for capacity views. */
  weeklyCapacityHours: number | null;
  startedOn: IsoDateTime | null;
  bio: string | null;
  githubLogin: string | null;
}
