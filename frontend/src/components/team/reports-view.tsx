'use client';

import * as React from 'react';
import { cn } from 'cn';
import { History, PenLine } from 'lucide-react';

import { DailyReportForm } from './daily-report-form';
import { DailyReportTimeline } from './daily-report-timeline';

const VIEWS = [
  { view: 'submit', label: 'Submit', icon: PenLine },
  { view: 'timeline', label: 'Timeline', icon: History },
] as const;

type ReportsViewName = (typeof VIEWS)[number]['view'];

/**
 * Submit / timeline switch for `/team/reports`.
 *
 * The timeline lives here rather than behind its own sidebar entry: the nav
 * items file is being edited on the roster branch, and a second entry added
 * here would collide with it.
 */
export function ReportsView() {
  const [view, setView] = React.useState<ReportsViewName>('submit');

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-center p-4 pb-0">
        <div
          role="radiogroup"
          aria-label="Reports view"
          className="bg-muted flex gap-0.5 rounded-md p-0.5"
        >
          {VIEWS.map((option) => {
            const Icon = option.icon;
            const isActive = option.view === view;

            return (
              <button
                key={option.view}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setView(option.view)}
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
      </div>

      {view === 'submit' ? <DailyReportForm /> : <DailyReportTimeline />}
    </div>
  );
}
