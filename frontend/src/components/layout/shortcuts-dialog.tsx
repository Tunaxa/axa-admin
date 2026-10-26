'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SECTIONS: Array<{ group: string; items: Array<{ keys: string[]; label: string }> }> = [
  {
    group: 'Global',
    items: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
      { keys: ['G', 'H'], label: 'Go to dashboard' },
      { keys: ['G', 'W'], label: 'Go to work board' },
      { keys: ['G', 'C'], label: 'Go to calendar' },
      { keys: ['G', 'D'], label: 'Go to docs' },
    ],
  },
  {
    group: 'Work',
    items: [
      { keys: ['C'], label: 'Create issue' },
      { keys: ['/'], label: 'Focus search' },
      { keys: ['Esc'], label: 'Close detail panel' },
    ],
  },
  {
    group: 'Docs',
    items: [
      { keys: ['/'], label: 'Open block type menu' },
      { keys: ['⌘', 'E'], label: 'Toggle edit / read' },
      { keys: ['↑', '↓'], label: 'Navigate the page tree' },
    ],
  },
  {
    group: 'Calendar',
    items: [
      { keys: ['M'], label: 'Month view' },
      { keys: ['W'], label: 'Week view' },
      { keys: ['D'], label: 'Day view' },
      { keys: ['T'], label: 'Go to today' },
    ],
  },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Every shortcut available in AXA Admin.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 pt-2 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.group} className="grid gap-2">
              <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {section.group}
              </h4>
              <ul className="grid gap-1.5">
                {section.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground/90">{item.label}</span>
                    <span className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={`${k}-${i}`}
                          className="bg-muted text-muted-foreground inline-flex min-w-5 items-center justify-center rounded border px-1.5 py-0.5 font-mono text-[11px]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
