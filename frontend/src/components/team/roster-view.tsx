'use client';

import { cn } from 'cn';
import { LayoutGrid, List } from 'lucide-react';
import * as React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Avatar, OwnershipTags, RoleBadge } from './member-bits';
import { fetchRoster } from './roster-api';
import type { RosterMember } from './types';

type RosterLayout = 'grid' | 'list';

const LAYOUT_OPTIONS: { layout: RosterLayout; label: string; icon: typeof List }[] = [
  { layout: 'grid', label: 'Grid', icon: LayoutGrid },
  { layout: 'list', label: 'List', icon: List },
];

type LoadState = 'loading' | 'ready' | 'failed';

/**
 * The team roster, as a card grid or a table.
 *
 * Both layouts show the same three things the roster exists to convey: who
 * someone is, the role they hold, and which applications they own.
 */
export function RosterView() {
  const [layout, setLayout] = React.useState<RosterLayout>('grid');
  const [members, setMembers] = React.useState<RosterMember[]>([]);
  const [state, setState] = React.useState<LoadState>('loading');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetchRoster()
      .then((loaded) => {
        if (cancelled) return;
        setMembers(loaded);
        setState('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not load the roster');
        setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <p className="text-muted-foreground p-4 text-sm">Loading the roster…</p>;
  }

  if (state === 'failed') {
    return (
      <div className="p-4">
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          The roster reads the API at <code className="font-mono">NEXT_PUBLIC_API_URL</code> and
          needs a signed-in session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <div
          role="radiogroup"
          aria-label="Roster layout"
          className="bg-muted flex gap-0.5 rounded-md p-0.5"
        >
          {LAYOUT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = option.layout === layout;

            return (
              <button
                key={option.layout}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setLayout(option.layout)}
                className={cn(
                  'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  isActive
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>

        <span className="text-muted-foreground text-xs">
          <span className="tabular-nums">{members.length}</span>{' '}
          {members.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {members.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            Nobody is on the team yet. Registering creates a user account; membership is granted
            separately.
          </p>
        ) : layout === 'grid' ? (
          <MemberGrid members={members} />
        ) : (
          <MemberTable members={members} />
        )}
      </div>
    </div>
  );
}

function MemberGrid({ members }: { members: RosterMember[] }) {
  return (
    <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <li key={member.id}>
          <article className="bg-card flex h-full flex-col gap-3 rounded-md border p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <Avatar name={member.user.name} className="size-10 text-sm" />
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium">{member.user.name}</h3>
                <p className="text-muted-foreground truncate text-xs">{member.user.email}</p>
              </div>
            </div>

            <RoleBadge role={member.role} />

            <div className="mt-auto">
              <OwnershipTags ownerships={member.ownerships} />
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

function MemberTable({ members }: { members: RosterMember[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead className="w-44">Role</TableHead>
          <TableHead>App ownership</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar name={member.user.name} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{member.user.name}</div>
                  <div className="text-muted-foreground truncate text-xs">{member.user.email}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <RoleBadge role={member.role} />
            </TableCell>
            <TableCell>
              <OwnershipTags ownerships={member.ownerships} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
