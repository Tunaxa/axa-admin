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
import { useIssuesContext } from '@/components/work/issues-provider';
import { STATUS_LABELS } from '@/components/work/labels';

import { NAV_ITEMS } from './nav-items';

/**
 * How many issues the palette will render at once.
 *
 * cmdk keeps every item mounted and scores it on each keystroke, so an
 * unbounded list would make typing slower the more issues a tenant has. The
 * cap is applied after filtering, so a search still reaches any issue.
 */
const MAX_ISSUE_RESULTS = 50;

/**
 * Command palette.
 *
 * Opens on Ctrl/Cmd+K and from the top bar trigger. It searches the issues the
 * board already loaded — selecting one opens its detail panel. Navigation
 * items are still inert: the module routes do not exist yet.
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
  const { issues, setOpenIssueId } = useIssuesContext();
  const [search, setSearch] = React.useState('');

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

  // Only show issues once something has been typed: the palette is for finding
  // a specific issue, and listing every one of them on open buries the rest.
  const matchingIssues = search.trim() ? issues.slice(0, MAX_ISSUE_RESULTS) : [];

  function openIssue(issueId: string) {
    setOpenIssueId(issueId);
    onOpenChange(false);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search issues and modules"
    >
      <Command>
        <CommandInput placeholder="Search issues…" value={search} onValueChange={setSearch} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {matchingIssues.length > 0 ? (
            <CommandGroup heading="Issues">
              {matchingIssues.map((issue) => (
                <CommandItem
                  key={issue.id}
                  // cmdk scores this string, so the status is searchable too.
                  value={`${issue.title} ${STATUS_LABELS[issue.status]}`}
                  onSelect={() => openIssue(issue.id)}
                >
                  <span className="truncate">{issue.title}</span>
                  <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                    {STATUS_LABELS[issue.status]}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

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
