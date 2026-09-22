import type { AppKey } from './app.js';
import type { TenantScopedEntity, UserId } from './common.js';

/**
 * Permission layer 1 — fixed system roles.
 *
 * Roles are intentionally a closed set for now; a customizable role editor is
 * a later-phase concern.
 */
export const SYSTEM_ROLES = [
  'owner',
  'pm_lead',
  'dev_team_leader',
  'developer',
  'designer',
  'viewer',
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

/**
 * Permission layer 2 — per-app scoping.
 *
 * A member holds one role per application, so the effective permission is
 * always evaluated as `role x app`.
 */
export interface AppRoleAssignment {
  app: AppKey;
  role: SystemRole;
}

/**
 * Permission layer 3 — approval rights.
 *
 * Approval rights are deliberately independent of job title: a developer may
 * be allowed to approve `axapass` account requests without being a lead.
 */
export const APPROVAL_RIGHTS = [
  'account_request.approve',
  'account_request.reject',
  'billing.manage',
  'member.manage',
  'docs.publish',
] as const;

export type ApprovalRight = (typeof APPROVAL_RIGHTS)[number];

export interface ApprovalGrant {
  app: AppKey;
  right: ApprovalRight;
}

/**
 * The join between a user and an organization. Membership — not the user
 * record — carries roles, so one user can belong to several tenants with
 * different permissions in each (permission layer 4).
 */
export interface Membership extends TenantScopedEntity {
  userId: UserId;
  /** Role applied when no app-specific assignment matches. */
  defaultRole: SystemRole;
  appRoles: AppRoleAssignment[];
  approvalGrants: ApprovalGrant[];
  status: MembershipStatus;
}

export type MembershipStatus = 'invited' | 'active' | 'suspended';
