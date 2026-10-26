'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppSidebar } from './app-sidebar';
import { TopBar } from './top-bar';

/** Routes rendered standalone, without the authed shell. */
const CHROMELESS_ROUTES = new Set<string>(['/login', '/register']);

/** Sidebar + top bar, wrapping the page content. Login screens render bare. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
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
