import type { Role } from './types';

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  pm_lead: 'PM / Lead',
  dev_team_leader: 'Dev Team Leader',
  developer: 'Developer',
  designer: 'Designer',
  viewer: 'Viewer',
};

/**
 * Emphasis only — every badge shows its label, so the information never
 * depends on colour alone.
 */
export const ROLE_STYLES: Record<Role, string> = {
  owner: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  pm_lead: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  dev_team_leader: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  developer: 'border-border bg-muted text-foreground',
  designer: 'border-pink-500/40 bg-pink-500/10 text-pink-700 dark:text-pink-400',
  viewer: 'border-border bg-muted text-muted-foreground',
};

/** Up to two letters, so an avatar stays legible at 32px. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';

  return (first + last).toUpperCase();
}
