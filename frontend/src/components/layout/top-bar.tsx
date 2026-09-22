'use client';

import { Search } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';

import { CommandPalette } from './command-palette';

/**
 * Top bar.
 *
 * Holds the command palette trigger and a placeholder account button. The
 * account button is inert — the session UI arrives with the task that wires
 * authentication into the frontend.
 */
export function TopBar() {
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  return (
    <header className="bg-background flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <Button
        variant="outline"
        className="text-muted-foreground w-full max-w-xs justify-start gap-2"
        onClick={() => setPaletteOpen(true)}
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="bg-muted text-muted-foreground rounded border px-1.5 font-mono text-xs">
          ⌘K
        </kbd>
      </Button>

      <div className="ml-auto">
        <Button variant="ghost" size="icon" aria-label="Account">
          <span className="bg-muted grid size-6 place-items-center rounded-full text-xs font-medium">
            A
          </span>
        </Button>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
