'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import type { ReactNode } from 'react';

import { AppSidebar } from './app-sidebar';
import { TopBar } from './top-bar';
import { AUTH_TOKEN_KEY } from '@/lib/api';

/** Routes rendered standalone, without the authed shell. */
const CHROMELESS_ROUTES = new Set<string>(['/login', '/register']);

/** Sidebar + top bar, wrapping the page content. Login screens render bare. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (CHROMELESS_ROUTES.has(pathname)) return;
    try {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        router.replace('/login');
      }
    } catch {
      // storage blocked
    }
  }, [pathname, router]);

  if (CHROMELESS_ROUTES.has(pathname)) {
    return <>{children}</>;
  }
  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
