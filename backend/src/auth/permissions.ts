import { Role } from '@prisma/client';

/**
 * What a route needs, named by the action rather than by who may do it.
 *
 * Annotating routes with roles would spread policy across every controller:
 * adding a role, or deciding a designer may now delete a page, would mean
 * editing call sites instead of one table. Routes say what they are; this file
 * says who may.
 */
export const PERMISSIONS = [
  'work:read',
  'work:write',
  'work:delete',
  'docs:read',
  'docs:write',
  'docs:delete',
  'team:read',
  'team:manage',
  'reports:read',
  'reports:write',
  'requests:read',
  'requests:write',
  'requests:decide',
  'billing:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const EVERY_PERMISSION = [...PERMISSIONS];

/** Read everything, change nothing. */
const VIEWER: Permission[] = [
  'work:read',
  'docs:read',
  'team:read',
  'reports:read',
  'requests:read',
];

/** Do the work, without reshaping the organisation or destroying its record. */
const CONTRIBUTOR: Permission[] = [
  ...VIEWER,
  'work:write',
  'docs:write',
  'reports:write',
  // Anyone on the team may ask for an account to be provisioned; deciding on
  // the request is a different matter, and so is paying for it.
  'requests:write',
];

/**
 * What each role may do.
 *
 * Deleting is kept away from the roles that do the day's work. An issue or a
 * page removed by accident takes its history with it — the activity feed and
 * the daily reports that referenced it survive, but what it said does not —
 * so deletion sits with the people who are accountable for the record.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.owner]: EVERY_PERMISSION,
  [Role.pm_lead]: EVERY_PERMISSION,
  [Role.dev_team_leader]: [
    ...CONTRIBUTOR,
    'work:delete',
    'docs:delete',
    // A team leader decides on requests from their team, but does not hold
    // the company card: approving creates a payment link, it does not pay.
    'requests:decide',
  ],
  [Role.developer]: CONTRIBUTOR,
  [Role.designer]: CONTRIBUTOR,
  [Role.viewer]: VIEWER,
};

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
