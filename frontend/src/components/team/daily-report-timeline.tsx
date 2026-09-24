'use client';

import * as React from 'react';
import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';
import { useIssuesContext } from '@/components/work/issues-provider';

import { fetchMe, fetchReportsByAuthor, todayIso } from './daily-reports-api';
import type { DailyReport } from './types';

/**
 * Per-developer daily report timeline.
 *
 * Pick a developer on the left, read their reports newest day first on the
 * right. The API already filters by author and orders by date, so this view
 * only has to render what it is given.
 */
export function DailyReportTimeline() {
  const { members, state: membersState, error: membersError } = useIssuesContext();

  const [meId, setMeId] = React.useState<string | null>(null);
  const [picked, setPicked] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetchMe()
      .then((claims) => {
        if (!cancelled) setMeId(claims.sub);
      })
      .catch(() => {
        // Not fatal: without it the list simply starts on the first developer
        // instead of on you, and nothing else in this view needs the caller.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Derived rather than stored, so no effect has to seed the selection once
  // `/auth/me` answers.
  const selected = picked ?? meId ?? members[0]?.id ?? null;

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <h2 className="text-muted-foreground mb-2 text-xs font-medium">Developer</h2>

        {membersState === 'loading' ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : membersState === 'failed' ? (
          // Distinct from the empty list below: a rejected token must not read
          // as "this organization has nobody in it".
          <p role="alert" className="text-destructive text-sm">
            {membersError ?? 'Could not load the team'}
          </p>
        ) : members.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nobody to show.</p>
        ) : (
          <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto md:max-h-none">
            {members.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => setPicked(member.id)}
                  aria-current={member.id === selected ? 'true' : undefined}
                  className={cn(
                    'hover:bg-muted w-full truncate rounded-md px-2 py-1.5 text-left text-sm',
                    member.id === selected && 'bg-muted font-medium',
                  )}
                >
                  {member.name}
                  {member.id === meId ? (
                    <span className="text-muted-foreground font-normal"> · you</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="min-w-0 flex-1">
        {selected ? (
          // Keyed so switching developer remounts on a clean loading state
          // rather than showing the previous person's reports under a new name.
          <Timeline key={selected} authorId={selected} />
        ) : null}
      </section>
    </div>
  );
}

type TimelineState = 'loading' | 'ready' | 'failed';

function Timeline({ authorId }: { authorId: string }) {
  const [state, setState] = React.useState<TimelineState>('loading');
  const [reports, setReports] = React.useState<DailyReport[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetchReportsByAuthor(authorId)
      .then((loaded) => {
        if (cancelled) return;
        setReports(loaded);
        setState('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not load the timeline');
        setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [authorId]);

  if (state === 'loading') {
    return <p className="text-muted-foreground text-sm">Loading the timeline…</p>;
  }

  if (state === 'failed') {
    return (
      <p role="alert" className="text-destructive text-sm">
        {error}
      </p>
    );
  }

  if (reports.length === 0) {
    return <p className="text-muted-foreground text-sm">No reports filed yet.</p>;
  }

  const today = todayIso();

  return (
    <ol className="flex flex-col">
      {reports.map((report) => (
        <li
          key={report.id}
          className="relative border-l pb-6 pl-5 last:border-transparent last:pb-0"
        >
          <span
            aria-hidden
            className="bg-border absolute top-1.5 -left-[4.5px] size-2 rounded-full"
          />

          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight">{formatDay(report.reportDate)}</h3>
            {report.reportDate.slice(0, 10) === today ? (
              <Badge variant="secondary">Today</Badge>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Entry label="Shipped" value={report.shipped} />
            {report.blocked ? (
              <Entry label="Blocked" value={report.blocked} />
            ) : (
              <p className="text-muted-foreground text-xs">Nothing blocked.</p>
            )}
            <Entry label="Next" value={report.next} />
          </div>

          {report.issues.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1">
              {report.issues.map((issue) => (
                <li key={issue.id}>
                  <Badge variant="outline" className="max-w-56 truncate">
                    {issue.title}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Entry({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}

/**
 * `reportDate` is UTC midnight, so it is formatted in UTC — reading it in the
 * viewer's timezone would show the previous day to anyone west of Greenwich.
 */
function formatDay(reportDate: string): string {
  return new Date(reportDate).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
