'use client';

import { cn } from 'cn';
import { Columns3, List } from 'lucide-react';

export const ISSUE_VIEWS = ['board', 'list'] as const;

export type IssueView = (typeof ISSUE_VIEWS)[number];

const VIEW_OPTIONS: { view: IssueView; label: string; icon: typeof List }[] = [
  { view: 'board', label: 'Board', icon: Columns3 },
  { view: 'list', label: 'List', icon: List },
];

/**
 * Board / list switch.
 *
 * A radio group rather than a pair of buttons: the two views are mutually
 * exclusive, which is what arrow-key navigation and `aria-checked` convey to
 * a screen reader.
 */
export function ViewToggle({
  view,
  onChange,
}: {
  view: IssueView;
  onChange: (view: IssueView) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Issue view"
      className="bg-muted flex gap-0.5 rounded-md p-0.5"
    >
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = option.view === view;

        return (
          <button
            key={option.view}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.view)}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              isActive
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
