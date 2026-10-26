'use client';

import { ArrowRight, Flag, Flame, Map as MapIcon, Minus, Target } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchIssues } from '@/components/work/issues-api';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/components/work/labels';
import type { Issue, IssuePriority } from '@/components/work/types';

const PRIORITY_ORDER: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'none'];

const PRIORITY_STYLE: Record<IssuePriority, { tone: string; icon: typeof Flag }> = {
  urgent: { tone: 'text-rose-600 dark:text-rose-400', icon: Flame },
  high: { tone: 'text-amber-600 dark:text-amber-400', icon: Flag },
  medium: { tone: 'text-sky-600 dark:text-sky-400', icon: Target },
  low: { tone: 'text-emerald-600 dark:text-emerald-400', icon: Minus },
  none: { tone: 'text-muted-foreground', icon: Minus },
};

function groupByPriority(issues: Issue[]): Record<IssuePriority, Issue[]> {
  const out: Record<IssuePriority, Issue[]> = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
    none: [],
  };
  for (const issue of issues) out[issue.priority].push(issue);
  return out;
}

function groupByProject(issues: Issue[]): Map<string, Issue[]> {
  const out = new Map<string, Issue[]>();
  for (const issue of issues) {
    const key = issue.app ?? 'unassigned';
    const list = out.get(key) ?? [];
    list.push(issue);
    out.set(key, list);
  }
  return out;
}

function progress(items: Issue[]) {
  const done = items.filter((i) => i.status === 'done').length;
  const inProgress = items.filter(
    (i) => i.status === 'in_progress' || i.status === 'in_review',
  ).length;
  return {
    done,
    inProgress,
    total: items.length,
    percent: items.length === 0 ? 0 : Math.round((done / items.length) * 100),
  };
}

export function RoadmapView() {
  const [issues, setIssues] = React.useState<Issue[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchIssues()
      .then((loaded) => {
        if (!cancelled) setIssues(loaded);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load the roadmap');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byPriority = React.useMemo(() => (issues ? groupByPriority(issues) : null), [issues]);
  const byProject = React.useMemo(() => (issues ? groupByProject(issues) : null), [issues]);
  const overall = React.useMemo(() => (issues ? progress(issues) : null), [issues]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
          <MapIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Roadmap</h1>
          <p className="text-muted-foreground text-sm">
            Delivery view by priority and by product.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            Open board
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      <section>
        <OverallBar value={overall} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {PRIORITY_ORDER.map((priority) => (
          <PriorityCard
            key={priority}
            priority={priority}
            items={byPriority?.[priority] ?? null}
          />
        ))}
      </section>

      <section>
        <h2 className="text-foreground mb-3 text-sm font-semibold uppercase tracking-wide">
          By product
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {byProject === null ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : byProject.size === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground pt-5 text-sm">
                No issues yet.
              </CardContent>
            </Card>
          ) : (
            Array.from(byProject.entries()).map(([app, items]) => (
              <ProjectCard key={app} name={formatAppLabel(app)} items={items} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function OverallBar({ value: p }: { value: ReturnType<typeof progress> | null }) {
  if (!p) return <Skeleton className="h-20 w-full" />;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">Delivery</h3>
          <span className="text-muted-foreground text-xs tabular-nums">
            {p.done}/{p.total} shipped · {p.inProgress} in flight
          </span>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${p.percent}%` }} />
        </div>
        <p className="text-muted-foreground text-xs">{p.percent}% complete across every priority.</p>
      </CardContent>
    </Card>
  );
}

function PriorityCard({
  priority,
  items,
}: {
  priority: IssuePriority;
  items: Issue[] | null;
}) {
  const style = PRIORITY_STYLE[priority];
  const Icon = style.icon;
  const p = items ? progress(items) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Icon className={`size-4 ${style.tone}`} aria-hidden />
          <span>{PRIORITY_LABELS[priority]}</span>
        </CardTitle>
        {p ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {p.done}/{p.total}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!items ? (
          <>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing scheduled.</p>
        ) : (
          <>
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${p?.percent ?? 0}%` }}
              />
            </div>
            <ul className="flex flex-col gap-1">
              {items.slice(0, 6).map((issue) => (
                <li
                  key={issue.id}
                  className="hover:bg-muted/60 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1 transition-colors"
                >
                  <Link href="/" className="min-w-0 flex-1 truncate text-sm">
                    {issue.title}
                  </Link>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {STATUS_LABELS[issue.status]}
                  </span>
                </li>
              ))}
            </ul>
            {items.length > 6 ? (
              <p className="text-muted-foreground text-xs">+{items.length - 6} more</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectCard({ name, items }: { name: string; items: Issue[] }) {
  const p = progress(items);
  const buckets = {
    backlog: items.filter((i) => i.status === 'backlog' || i.status === 'todo').length,
    inProgress: items.filter((i) => i.status === 'in_progress' || i.status === 'in_review').length,
    done: p.done,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="truncate">{name}</CardTitle>
        <span className="text-muted-foreground text-xs tabular-nums">{p.percent}%</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${(buckets.done / Math.max(p.total, 1)) * 100}%` }}
          />
          <div
            className="h-full bg-sky-500"
            style={{ width: `${(buckets.inProgress / Math.max(p.total, 1)) * 100}%` }}
          />
          <div
            className="h-full bg-amber-400/70"
            style={{ width: `${(buckets.backlog / Math.max(p.total, 1)) * 100}%` }}
          />
        </div>
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <Legend tone="bg-emerald-500" label={`${buckets.done} done`} />
          <Legend tone="bg-sky-500" label={`${buckets.inProgress} in flight`} />
          <Legend tone="bg-amber-400/70" label={`${buckets.backlog} planned`} />
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${tone}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

function formatAppLabel(app: string): string {
  switch (app) {
    case 'axa_admin':
      return 'AXA Admin';
    case 'axacrm':
      return 'AXA CRM';
    case 'axapass':
      return 'AXA Pass';
    case 'website':
      return 'Website';
    case 'unassigned':
      return 'Unassigned';
    default:
      return app;
  }
}
