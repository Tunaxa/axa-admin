'use client';

import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';
import { APP_LABELS } from '@/components/work/labels';

import { ROLE_LABELS, ROLE_STYLES, initialsOf } from './labels';
import type { AppOwnership, Role } from './types';

/**
 * Initials avatar.
 *
 * There is no avatar image anywhere in the data model, so initials are the
 * picture. `aria-hidden` because the member's name is always rendered beside
 * it — announcing "RF" as well would just be noise.
 */
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        'bg-muted text-muted-foreground grid shrink-0 place-items-center rounded-full font-medium',
        className ?? 'size-8 text-xs',
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
        ROLE_STYLES[role],
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

/**
 * The member's `role x app` ownerships.
 *
 * Each tag carries the application and the role held there, because the same
 * person can own one app and only read another — showing the app alone would
 * lose the half that matters.
 */
export function OwnershipTags({ ownerships }: { ownerships: AppOwnership[] }) {
  if (ownerships.length === 0) {
    return <span className="text-muted-foreground text-xs">No app ownership</span>;
  }

  return (
    <ul className="flex flex-wrap gap-1">
      {ownerships.map((ownership) => (
        <li key={ownership.app}>
          <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
            {APP_LABELS[ownership.app]}
            <span className="text-muted-foreground font-sans">{ROLE_LABELS[ownership.role]}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
