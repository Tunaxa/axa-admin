import type { ReactNode } from 'react';

import { AppSidebar } from './app-sidebar';
import { TopBar } from './top-bar';

/** Sidebar plus top bar, wrapping the page content. */
export function AppShell({ children }: { children: ReactNode }) {
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
