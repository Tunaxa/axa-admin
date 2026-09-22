'use client';

import * as React from 'react';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

import { NAV_ITEMS } from './nav-items';

/**
 * Command palette shell.
 *
 * Opens on Ctrl/Cmd+K and from the top bar trigger. Items render and filter,
 * but selecting one only closes the palette — there are no commands to run and
 * no routes to navigate to yet.
 *
 * `CommandDialog` renders its children straight into the dialog without
 * providing cmdk's context, so the contents have to be wrapped in `Command`
 * here; without it `CommandInput` throws at render.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search modules and actions"
    >
      <Command>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <CommandItem key={item.key} value={item.label} onSelect={() => onOpenChange(false)}>
                  <Icon className="size-4" aria-hidden />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
