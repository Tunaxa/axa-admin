import { apiFetch } from '@/lib/api';

import type { RosterMember } from './types';

export async function fetchRoster(): Promise<RosterMember[]> {
  return apiFetch<RosterMember[]>('/team-members');
}

export type AppKey = 'axa_admin' | 'axacrm' | 'axapass' | 'website';
export type Role = 'owner' | 'pm_lead' | 'dev_team_leader' | 'developer' | 'designer' | 'viewer';

export interface InviteMemberInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  team?: AppKey;
}

/** One-shot invite — creates the user, roster entry and app ownership. */
export async function inviteMember(input: InviteMemberInput): Promise<RosterMember> {
  return apiFetch<RosterMember>('/team-members/invite', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
