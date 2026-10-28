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
  'calendar:read',
  'calendar:write',
  'calendar:delete',
  'orgchart:read',
  'orgchart:write',
  'orgchart:delete',
  'requests:read',
  'requests:write',
  'requests:decide',
  'billing:manage',
  'departments:read',
  'departments:manage',
  'projects:manage',
  'executive:read',
  'productivity:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const EVERY_PERMISSION = [...PERMISSIONS];

/** Read what belongs to their own department, change nothing. */
const VIEWER: Permission[] = [
  'work:read',
  'docs:read',
  'team:read',
  'reports:read',
  'calendar:read',
  'orgchart:read',
  'departments:read',
];

/** Do the work, without reshaping the organisation or destroying its record. */
const MEMBER: Permission[] = [
  ...VIEWER,
  'work:write',
  'docs:write',
  'reports:write',
  'calendar:write',
  'orgchart:write',
];

/**
 * The manager of a department.
 *
 * Runs one department: its projects, its people, its requests. Everything is
 * scoped to that department by the services, not by this table — the table only
 * says which kinds of action are open to the role.
 */
const MANAGER: Permission[] = [
  ...MEMBER,
  'work:delete',
  'docs:delete',
  'calendar:delete',
  'orgchart:delete',
  'team:manage',
  'projects:manage',
  'productivity:read',
];

/**
 * What each role may do.
 *
 * - `owner` is the CEO: every permission, every department.
 * - `dev_team_leader` and `pm_lead` are department managers.
 * - `developer` and `designer` do the work in their department.
 * - `viewer` reads their department.
 *
 * Deleting is kept away from the roles that do the day's work: an issue or a
 * page removed by accident takes its history with it, so deletion sits with the
 * people who are accountable for the record.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.owner]: EVERY_PERMISSION,
  [Role.pm_lead]: MANAGER,
  [Role.dev_team_leader]: MANAGER,
  [Role.developer]: MEMBER,
  [Role.designer]: MEMBER,
  [Role.viewer]: VIEWER,
};

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
