import { apiFetch } from '@/lib/api';

import type { RosterMember } from './types';

export async function fetchRoster(): Promise<RosterMember[]> {
  return apiFetch<RosterMember[]>('/team-members');
}

/** The roles somebody can be invited into; managers are named from Départements. */
export type MemberRole = 'developer' | 'designer' | 'viewer';

export interface InviteMemberInput {
  email: string;
  name: string;
  password: string;
  role: MemberRole;
  /** Required for the CEO; a manager always invites into their own department. */
  departmentId?: string;
}

/** One-shot invite: creates the account and puts it on the department's team. */
export async function inviteMember(input: InviteMemberInput): Promise<RosterMember> {
  return apiFetch<RosterMember>('/team-members/invite', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
