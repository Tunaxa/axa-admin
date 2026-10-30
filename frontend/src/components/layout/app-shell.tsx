'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import type { ReactNode } from 'react';

import { FOCUS_RING } from '@/lib/focus';

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
      {/*
        The first thing in the tab order, and hidden until it has focus.
        Without it a keyboard user crosses seven navigation items and two
        toolbar buttons before reaching the page — on every page, every time.
      */}
      <a
        href="#main"
        className={`bg-background focus-visible:ring-ring sr-only rounded-md border px-3 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:ring-2 ${FOCUS_RING}`}
      >
        Skip to content
      </a>

      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {/*
          `tabIndex={-1}` so the skip link can actually move focus here:
          without it the browser scrolls to the anchor and leaves focus behind,
          and the next Tab goes back to the top of the page.
        */}
        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
