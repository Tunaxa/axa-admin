'use client';

import {
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Crown,
  Users,
} from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';

/**
 * Executive overview.
 *
 * CEO-facing view that groups issues by department (= AXA application) and by
 * department leader (= team member whose per-app role is `owner`, `pm_lead`
 * or `dev_team_leader`). Status colours:
 *
 * - green when done
 * - grey when in progress or in review
 * - red when the issue is still untouched (backlog or todo) past the overdue
 *   threshold — "pass leur temps et ne pas encore travailler"
 * - amber when not yet started but still inside the threshold
 *
 * The threshold defaults to 14 days from `createdAt` because `Issue` has no
 * due-date field yet; the control at the top lets the viewer change it.
 */

type AppKey = 'axa_admin' | 'axacrm' | 'axapass' | 'website';
type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
type IssuePriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
type Role =
  | 'owner'
  | 'pm_lead'
  | 'dev_team_leader'
  | 'developer'
  | 'designer'
  | 'viewer';

interface IssueRaw {
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  app: AppKey | null;
  assigneeId: string | null;
  createdAt: string;
  closedAt: string | null;
}

interface RosterEntry {
  id: string;
  role: Role;
  user: { id: string; name: string; email: string };
  ownerships: { app: AppKey; role: Role }[];
}

interface TrackedIssue extends IssueRaw {
  tone: 'done' | 'in_flight' | 'overdue' | 'planned';
  ageDays: number;
}

const LEADER_ROLES = new Set<Role>(['owner', 'pm_lead', 'dev_team_leader']);

const DEPARTMENTS: Array<{ app: AppKey; label: string; description: string }> = [
  { app: 'axa_admin', label: 'AXA Admin', description: 'Internal operations platform' },
  { app: 'axacrm', label: 'AXA CRM', description: 'Customer relationship' },
  { app: 'axapass', label: 'AXA Pass', description: 'Identity and access' },
  { app: 'website', label: 'Website', description: 'Public marketing site' },
];

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  pm_lead: 'PM Lead',
  dev_team_leader: 'Dev Team Leader',
  developer: 'Developer',
  designer: 'Designer',
  viewer: 'Viewer',
};

const STATUS_LABEL: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
  cancelled: 'Cancelled',
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function classify(issue: IssueRaw, overdueDays: number): TrackedIssue {
  const now = new Date();
  const created = new Date(issue.createdAt);
  const ageDays = Math.max(0, daysBetween(now, created));

  if (issue.status === 'done') return { ...issue, tone: 'done', ageDays };
  if (issue.status === 'in_progress' || issue.status === 'in_review')
    return { ...issue, tone: 'in_flight', ageDays };
  // backlog or todo (or cancelled, treated as planned)
  if (issue.status !== 'cancelled' && ageDays >= overdueDays)
    return { ...issue, tone: 'overdue', ageDays };
  return { ...issue, tone: 'planned', ageDays };
}

export function ExecutiveView() {
  const [overdueDays, setOverdueDays] = React.useState(14);
  const [issues, setIssues] = React.useState<IssueRaw[] | null>(null);
  const [roster, setRoster] = React.useState<RosterEntry[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([apiFetch<IssueRaw[]>('/issues'), apiFetch<RosterEntry[]>('/team-members')])
      .then(([loadedIssues, loadedRoster]) => {
        if (cancelled) return;
        setIssues(loadedIssues);
        setRoster(loadedRoster);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load the executive view');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tracked = React.useMemo(
    () => (issues ? issues.map((i) => classify(i, overdueDays)) : null),
    [issues, overdueDays],
  );

  const assigneeName = React.useCallback(
    (id: string | null): string => {
      if (!id || !roster) return 'Unassigned';
      const match = roster.find((r) => r.user.id === id);
      return match ? match.user.name : 'Unknown';
    },
    [roster],
  );

  const overall = React.useMemo(() => {
    if (!tracked) return null;
    return {
      total: tracked.length,
      done: tracked.filter((t) => t.tone === 'done').length,
      inFlight: tracked.filter((t) => t.tone === 'in_flight').length,
      overdue: tracked.filter((t) => t.tone === 'overdue').length,
      planned: tracked.filter((t) => t.tone === 'planned').length,
    };
  }, [tracked]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
          <Crown className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Executive overview</h1>
          <p className="text-muted-foreground text-sm">
            Delivery by department and by leader. Red is behind, grey is in flight, green is shipped.
          </p>
        </div>
        <ThresholdPicker value={overdueDays} onChange={setOverdueDays} />
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Overdue"
          value={overall?.overdue}
          loading={!overall}
          icon={AlertTriangle}
          tone="rose"
        />
        <StatCard
          label="In flight"
          value={overall?.inFlight}
          loading={!overall}
          icon={Clock}
          tone="slate"
        />
        <StatCard
          label="Shipped"
          value={overall?.done}
          loading={!overall}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Planned"
          value={overall?.planned}
          loading={!overall}
          icon={Briefcase}
          tone="amber"
        />
      </section>

      <section className="grid gap-4">
        {DEPARTMENTS.map((dept) => (
          <DepartmentSection
            key={dept.app}
            department={dept}
            tracked={tracked}
            roster={roster}
            overdueDays={overdueDays}
            assigneeName={assigneeName}
          />
        ))}
      </section>
    </div>
  );
}

function ThresholdPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const options = [7, 14, 30, 60];
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground mr-1">Overdue after</span>
      {options.map((o) => (
        <Button
          key={o}
          size="sm"
          variant={o === value ? 'default' : 'outline'}
          onClick={() => onChange(o)}
          className="h-7 min-w-10 px-2 text-xs"
        >
          {o}d
        </Button>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  icon: Icon,
  tone,
}: {
  label: string;
  value?: number;
  loading: boolean;
  icon: typeof Clock;
  tone: 'rose' | 'slate' | 'emerald' | 'amber';
}) {
  const toneClass =
    tone === 'rose'
      ? 'text-rose-600 dark:text-rose-400'
      : tone === 'emerald'
        ? 'text-emerald-600 dark:text-emerald-400'
        : tone === 'amber'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-slate-600 dark:text-slate-400';

  return (
    <Card>
      <CardContent className="flex flex-row items-center gap-3 pt-5">
        <span className={`bg-muted/60 grid size-10 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-14" />
          ) : (
            <span className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value ?? 0}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DepartmentSection({
  department,
  tracked,
  roster,
  overdueDays,
  assigneeName,
}: {
  department: { app: AppKey; label: string; description: string };
  tracked: TrackedIssue[] | null;
  roster: RosterEntry[] | null;
  overdueDays: number;
  assigneeName: (id: string | null) => string;
}) {
  const deptIssues = React.useMemo(
    () => (tracked ? tracked.filter((t) => t.app === department.app) : null),
    [tracked, department.app],
  );

  const leaders = React.useMemo(() => {
    if (!roster) return [];
    return roster.filter((r) => {
      const ownership = r.ownerships.find((o) => o.app === department.app);
      const effective = ownership?.role ?? r.role;
      return LEADER_ROLES.has(effective);
    });
  }, [roster, department.app]);

  const summary = React.useMemo(() => {
    if (!deptIssues)
      return { total: 0, done: 0, inFlight: 0, overdue: 0, planned: 0, percent: 0 };
    const total = deptIssues.length;
    const done = deptIssues.filter((t) => t.tone === 'done').length;
    const inFlight = deptIssues.filter((t) => t.tone === 'in_flight').length;
    const overdue = deptIssues.filter((t) => t.tone === 'overdue').length;
    const planned = deptIssues.filter((t) => t.tone === 'planned').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, inFlight, overdue, planned, percent };
  }, [deptIssues]);

  const [notStarted, inFlight, done] = React.useMemo(() => {
    const n = (deptIssues ?? []).filter((t) => t.tone === 'overdue' || t.tone === 'planned');
    const f = (deptIssues ?? []).filter((t) => t.tone === 'in_flight');
    const d = (deptIssues ?? []).filter((t) => t.tone === 'done');
    return [n, f, d];
  }, [deptIssues]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-md">
            <Building2 className="size-4" aria-hidden />
          </span>
          <div>
            <CardTitle>{department.label}</CardTitle>
            <p className="text-muted-foreground text-xs">{department.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <span className="text-muted-foreground tabular-nums">
            {summary.done}/{summary.total} shipped
          </span>
          {summary.overdue > 0 ? (
            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
              {summary.overdue} overdue
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-emerald-500 h-full"
            style={{ width: `${(summary.done / Math.max(summary.total, 1)) * 100}%` }}
          />
          <div
            className="bg-slate-400 h-full"
            style={{ width: `${(summary.inFlight / Math.max(summary.total, 1)) * 100}%` }}
          />
          <div
            className="bg-rose-500 h-full"
            style={{ width: `${(summary.overdue / Math.max(summary.total, 1)) * 100}%` }}
          />
          <div
            className="bg-amber-400 h-full"
            style={{ width: `${(summary.planned / Math.max(summary.total, 1)) * 100}%` }}
          />
        </div>

        {leaders.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            <Users className="mr-1 inline size-3.5" aria-hidden />
            No leader assigned to this department yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {leaders.map((leader) => {
              const ownership = leader.ownerships.find((o) => o.app === department.app);
              const role = ownership?.role ?? leader.role;
              const leaderTasks = (deptIssues ?? []).filter(
                (t) => t.assigneeId === leader.user.id,
              );
              const leaderOverdue = leaderTasks.filter((t) => t.tone === 'overdue').length;
              return (
                <span
                  key={leader.id}
                  className="bg-muted/50 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
                >
                  <span className="font-medium">{leader.user.name}</span>
                  <span className="text-muted-foreground">· {ROLE_LABEL[role]}</span>
                  <span className="text-muted-foreground tabular-nums">· {leaderTasks.length}</span>
                  {leaderOverdue > 0 ? (
                    <span className="rounded-full bg-rose-500/20 px-1.5 py-0 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                      {leaderOverdue} late
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-3">
          <TaskColumn
            heading="Not started"
            items={deptIssues === null ? null : notStarted}
            emptyText="Nothing in the backlog."
            overdueDays={overdueDays}
            assigneeName={assigneeName}
          />
          <TaskColumn
            heading="In progress"
            items={deptIssues === null ? null : inFlight}
            emptyText="Nothing in flight."
            overdueDays={overdueDays}
            assigneeName={assigneeName}
          />
          <TaskColumn
            heading="Done"
            items={deptIssues === null ? null : done}
            emptyText="Nothing shipped yet."
            overdueDays={overdueDays}
            assigneeName={assigneeName}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TaskColumn({
  heading,
  items,
  emptyText,
  overdueDays,
  assigneeName,
}: {
  heading: string;
  items: TrackedIssue[] | null;
  emptyText: string;
  overdueDays: number;
  assigneeName: (id: string | null) => string;
}) {
  const headingTone =
    heading === 'Done'
      ? 'text-emerald-700 dark:text-emerald-400'
      : heading === 'In progress'
        ? 'text-slate-700 dark:text-slate-300'
        : 'text-rose-700 dark:text-rose-400';

  return (
    <div className="bg-muted/30 flex min-h-32 flex-col gap-2 rounded-md border p-2">
      <div className="flex items-center justify-between px-1">
        <h4 className={`text-xs font-semibold uppercase tracking-wide ${headingTone}`}>
          {heading}
        </h4>
        {items ? (
          <span className="text-muted-foreground text-xs tabular-nums">{items.length}</span>
        ) : null}
      </div>
      {items === null ? (
        <>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-4/5" />
        </>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground px-1 py-2 text-xs">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <IssueChip
              key={item.id}
              item={item}
              overdueDays={overdueDays}
              assigneeName={assigneeName(item.assigneeId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function IssueChip({
  item,
  overdueDays,
  assigneeName,
}: {
  item: TrackedIssue;
  overdueDays: number;
  assigneeName: string;
}) {
  const toneClass =
    item.tone === 'done'
      ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40'
      : item.tone === 'in_flight'
        ? 'border-slate-400/40 bg-slate-50 dark:bg-slate-900/40'
        : item.tone === 'overdue'
          ? 'border-rose-500/50 bg-rose-50 dark:bg-rose-950/40'
          : 'border-amber-400/40 bg-amber-50 dark:bg-amber-950/30';

  const statusTone =
    item.tone === 'done'
      ? 'text-emerald-700 dark:text-emerald-300'
      : item.tone === 'in_flight'
        ? 'text-slate-600 dark:text-slate-300'
        : item.tone === 'overdue'
          ? 'text-rose-700 dark:text-rose-300'
          : 'text-amber-700 dark:text-amber-300';

  return (
    <li
      className={`flex flex-col gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</span>
        <span className={`shrink-0 text-[10px] font-semibold uppercase ${statusTone}`}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate">{assigneeName}</span>
        <span className="shrink-0 tabular-nums">
          {item.tone === 'overdue'
            ? `${item.ageDays - overdueDays + 1}d late`
            : item.tone === 'done'
              ? 'Shipped'
              : `${item.ageDays}d old`}
        </span>
      </div>
    </li>
  );
}
