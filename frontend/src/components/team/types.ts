/**
 * Roster shapes.
 *
 * These mirror the backend's `role` enum and the `/team-members` response. They
 * are declared here rather than imported because the frontend and backend are
 * independent projects.
 */

import type { AppKey } from '@/components/work/types';

export const ROLES = [
  'owner',
  'pm_lead',
  'dev_team_leader',
  'developer',
  'designer',
  'viewer',
] as const;

export type Role = (typeof ROLES)[number];

export interface AppOwnership {
  app: AppKey;
  role: Role;
}

export interface RosterMember {
  id: string;
  role: Role;
  createdAt: string;
  user: { id: string; name: string; email: string };
  ownerships: AppOwnership[];
}
