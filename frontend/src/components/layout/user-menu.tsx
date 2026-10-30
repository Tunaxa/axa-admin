'use client';

import { Keyboard, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { cn } from 'cn';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiFetch, AUTH_TOKEN_KEY } from '@/lib/api';

interface Me {
  sub: string;
  org: string;
  email: string;
}

function initialsOf(email: string | null): string {
  if (!email) return 'A';
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts
    .map((p) => p[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  return (letters || local.slice(0, 2) || 'A').toUpperCase();
}

export function UserMenu({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  const router = useRouter();
  const [me, setMe] = React.useState<Me | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void apiFetch<Me>('/auth/me')
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function signOut() {
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // ignore
    }
    router.push('/login');
    router.refresh();
  }

  const initials = initialsOf(me?.email ?? null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account menu"
          className={cn(
            'relative p-0 ring-1 ring-transparent transition-shadow hover:ring-border focus-visible:ring-ring',
          )}
        >
          <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-[11px] font-semibold">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <div className="px-2.5 py-2">
          <div className="text-foreground truncate text-sm font-medium">
            {me?.email ?? 'Signed out'}
          </div>
          <div className="text-muted-foreground mt-0.5 truncate text-xs">
            {me ? `Tenant ${me.org.slice(0, 8)}…` : 'No active session'}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuItem disabled>
          <UserIcon className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="size-4" />
          Preferences
        </DropdownMenuItem>
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
