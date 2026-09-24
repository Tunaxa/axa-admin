import { apiFetch } from '@/lib/api';

import type { RosterMember } from './types';

export async function fetchRoster(): Promise<RosterMember[]> {
  return apiFetch<RosterMember[]>('/team-members');
}
