'use client';

import { Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';

import { CommandPalette } from './command-palette';
import { HealthBadge } from './health-badge';
import { NAV_ITEMS } from './nav-items';
import { ShortcutsDialog } from './shortcuts-dialog';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

/**
 * Top bar.
 *
 * Shows the active section as a breadcrumb, a wide search trigger that opens
 * the command palette, a health pulse for the API, the theme toggle and the
 * account menu. Sticky, with a frosted-glass look while content scrolls under
 * it.
 */
export function TopBar() {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  const current = React.useMemo(() => {
    if (pathname === '/') return NAV_ITEMS.find((n) => n.key === 'work');
    return NAV_ITEMS.find(
      (n) => n.href !== undefined && n.href !== '/' && pathname.startsWith(n.href),
    );
  }, [pathname]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      if (event.key === '?' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="bg-background/70 supports-[backdrop-filter]:bg-background/55 border-border/60 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-xl">
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="text-muted-foreground hidden text-xs md:inline">
          {current?.group === 'overview'
            ? 'Overview'
            : current?.group === 'org'
              ? 'Organization'
              : 'Workspace'}
          <span className="mx-1 opacity-40">/</span>
        </span>
        <span className="text-foreground text-sm font-semibold">
          {current?.label ?? 'Dashboard'}
        </span>
      </div>

      <Button
        variant="outline"
        className="text-muted-foreground border-border/80 bg-background/40 hover:bg-background/80 hidden h-9 min-w-0 flex-1 justify-start gap-2 rounded-full px-3 text-sm shadow-none md:flex lg:max-w-md"
        onClick={() => setPaletteOpen(true)}
      >
        <Search className="size-4 opacity-70" aria-hidden />
        <span className="flex-1 text-left">Search issues, pages, people…</span>
        <kbd className="bg-muted/60 text-muted-foreground inline-flex items-center gap-0.5 rounded border px-1.5 font-mono text-[11px]">
          ⌘K
        </kbd>
      </Button>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search"
        >
          <Search className="size-4" />
        </Button>
        <HealthBadge />
        <ThemeToggle />
        <UserMenu onOpenShortcuts={() => setShortcutsOpen(true)} />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </header>
  );
}
