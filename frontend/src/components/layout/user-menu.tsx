'use client';

import { Keyboard, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ROLE_LABEL, useAccess } from '@/components/providers/access-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AUTH_TOKEN_KEY } from '@/lib/api';

function initialsOf(email: string | null): string {
  if (!email) return 'A';

  const local = email.split('@')[0] ?? '';
  const letters = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('');

  return (letters || local.slice(0, 2) || 'A').toUpperCase();
}

export function UserMenu({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  const router = useRouter();
  const access = useAccess();

  function signOut() {
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // storage blocked
    }

    router.push('/login');
    router.refresh();
  }

  const email = access.me?.email ?? null;
  const roleLabel = access.role ? ROLE_LABEL[access.role] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account menu" className="p-0">
          <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-[11px] font-semibold">
            {initialsOf(email)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <div className="px-2.5 py-2">
          <div className="text-foreground truncate text-sm font-medium">
            {email ?? 'Signed out'}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {roleLabel ? (
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {roleLabel}
              </span>
            ) : null}
            <span className="text-muted-foreground truncate text-xs">
              {access.department
                ? access.department.name
                : access.isCeo
                  ? 'Tous les départements'
                  : 'Aucun département'}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onOpenShortcuts}>
          <Keyboard className="size-4" />
          Keyboard shortcuts
          <kbd className="bg-muted text-muted-foreground ml-auto rounded border px-1 font-mono text-[10px]">
            ?
          </kbd>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
