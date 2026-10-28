'use client';

import { Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import type { ReactNode } from 'react';

import { AccessProvider, useAccess } from '@/components/providers/access-provider';
import { Button } from '@/components/ui/button';
import { IssuesProvider } from '@/components/work/issues-provider';
import { AUTH_TOKEN_KEY } from '@/lib/api';

import { AppSidebar } from './app-sidebar';
import { navItemFor } from './nav-items';
import { TopBar } from './top-bar';

/** Routes rendered standalone, without the authenticated shell. */
const CHROMELESS_ROUTES = new Set<string>(['/login']);

/**
 * Sidebar + top bar, wrapping the page content. The login screen renders bare.
 *
 * Everything that holds a person's data (access, issues) is created inside the
 * authenticated branch, so it is rebuilt at every sign-in and dropped at every
 * sign-out: one account never sees what another one loaded.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const bare = CHROMELESS_ROUTES.has(pathname);

  React.useEffect(() => {
    if (bare) return;

    try {
      if (!window.localStorage.getItem(AUTH_TOKEN_KEY)) {
        router.replace('/login');
      }
    } catch {
      // storage blocked: the first API call will bounce to the login.
    }
  }, [bare, pathname, router]);

  if (bare) {
    return <>{children}</>;
  }

  return (
    <AccessProvider>
      <IssuesProvider>
        <div className="flex h-svh overflow-hidden">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-y-auto">
              <AccessGate>{children}</AccessGate>
            </main>
          </div>
        </div>
      </IssuesProvider>
    </AccessProvider>
  );
}

/** Opens the page only for somebody whose role is allowed to see it. */
function AccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const access = useAccess();

  if (access.status === 'loading') {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Chargement…
      </div>
    );
  }

  if (access.status === 'error') {
    return (
      <div className="text-destructive p-6 text-sm" role="alert">
        Impossible de vérifier tes accès. Vérifie que l&apos;API est joignable.
      </div>
    );
  }

  const item = navItemFor(pathname);

  if (item?.permission && !access.can(item.permission)) {
    return <AccessDenied page={item.label} />;
  }

  return <>{children}</>;
}

function AccessDenied({ page }: { page: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="bg-destructive/10 text-destructive grid size-12 place-items-center rounded-full">
        <ShieldAlert className="size-6" aria-hidden />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Accès refusé</h1>
        <p className="text-muted-foreground text-sm">
          Ton rôle ne donne pas accès à la page « {page} ». Demande à ton manager ou au CEO si tu en
          as besoin.
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/">Retour à mon espace</Link>
      </Button>
    </div>
  );
}
