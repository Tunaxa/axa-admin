'use client';

import {
  ArrowDownNarrowWide,
  ChevronDown,
  ChevronRight,
  Flame,
  Gauge as GaugeIcon,
  Medal,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import * as React from 'react';

import { useAccess } from '@/components/providers/access-provider';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api';

/**
 * Productivity view.
 *
 * Ranks every assignable team member by what they're doing with their open
 * tasks, and lets a reader expand a row to see the actual issues behind the
 * numbers. All stats are derived client-side from `/issues` and
 * `/team-members` so a new metric is a formula edit, not a new endpoint.
 *
 * Score formula: a done issue is 1 point, in-progress 0.5, in-review 0.75,
 * backlog/todo 0. Priority weights multiply the point (none=1, low=1,
 * medium=1.5, high=2, urgent=3) so an urgent shipped issue is worth more
 * than three low-priority ones.
 */

type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
type IssuePriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
type Role = 'owner' | 'pm_lead' | 'dev_team_leader' | 'developer' | 'designer' | 'viewer';

interface IssueRaw {
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  departmentId: string | null;
  assigneeId: string | null;
  projectId: string | null;
  createdAt: string;
  closedAt: string | null;
}

interface RosterEntry {
  id: string;
  role: Role;
  user: { id: string; name: string; email: string };
  departmentId: string | null;
}

type SortMode = 'score' | 'done' | 'inflight' | 'name';

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

const PRIORITY_WEIGHT: Record<IssuePriority, number> = {
  none: 1,
  low: 1,
  medium: 1.5,
  high: 2,
  urgent: 3,
};

const STATUS_WEIGHT: Record<IssueStatus, number> = {
  backlog: 0,
  todo: 0,
  in_progress: 0.5,
  in_review: 0.75,
  done: 1,
  cancelled: 0,
};

interface MemberStats {
  member: RosterEntry;
  score: number;
  total: number;
  done: number;
  inFlight: number;
  todo: number;
  progressPercent: number;
  tasks: IssueRaw[];
}

function computeStats(member: RosterEntry, issues: IssueRaw[]): MemberStats {
  const mine = issues.filter((i) => i.assigneeId === member.user.id);
  const done = mine.filter((t) => t.status === 'done').length;
  const inFlight = mine.filter(
    (t) => t.status === 'in_progress' || t.status === 'in_review',
  ).length;
  const todo = mine.filter((t) => t.status === 'backlog' || t.status === 'todo').length;
  const score = mine.reduce(
    (acc, t) => acc + STATUS_WEIGHT[t.status] * PRIORITY_WEIGHT[t.priority],
    0,
  );
  const progressPercent = mine.length === 0 ? 0 : Math.round((done / mine.length) * 100);
  return {
    member,
    score: Math.round(score * 10) / 10,
    total: mine.length,
    done,
    inFlight,
    todo,
    progressPercent,
    tasks: mine,
  };
}

export function ProductivityView() {
  const [issues, setIssues] = React.useState<IssueRaw[] | null>(null);
  const [roster, setRoster] = React.useState<RosterEntry[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const access = useAccess();
  const [dept, setDept] = React.useState<string>('all');
  const [sort, setSort] = React.useState<SortMode>('score');
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([apiFetch<IssueRaw[]>('/issues'), apiFetch<RosterEntry[]>('/team-members')])
      .then(([i, r]) => {
        if (cancelled) return;
        setIssues(i);
        setRoster(r);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load productivity data');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = React.useMemo(() => {
    if (!issues || !roster) return null;
    const filteredIssues = dept === 'all' ? issues : issues.filter((i) => i.departmentId === dept);
    // The CEO sits above the departments and is not ranked among the people.
    const relevantMembers = roster.filter(
      (m) => m.role !== 'owner' && (dept === 'all' || m.departmentId === dept),
    );
    const scored = relevantMembers.map((m) => computeStats(m, filteredIssues));

    const sorted = [...scored].sort((a, b) => {
      switch (sort) {
        case 'done':
          return b.done - a.done || b.score - a.score;
        case 'inflight':
          return b.inFlight - a.inFlight || b.score - a.score;
        case 'name':
          return a.member.user.name.localeCompare(b.member.user.name);
        case 'score':
        default:
          return b.score - a.score || b.done - a.done;
      }
    });

    return sorted;
  }, [issues, roster, dept, sort]);

  const totals = React.useMemo(() => {
    if (!stats) return null;
    return {
      members: stats.filter((s) => s.total > 0).length,
      done: stats.reduce((acc, s) => acc + s.done, 0),
      inFlight: stats.reduce((acc, s) => acc + s.inFlight, 0),
      todo: stats.reduce((acc, s) => acc + s.todo, 0),
      avgScore:
        stats.length === 0
          ? 0
          : Math.round((stats.reduce((acc, s) => acc + s.score, 0) / stats.length) * 10) / 10,
    };
  }, [stats]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const topScore = stats?.[0]?.score ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <Trophy className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Productivité</h1>
          <p className="text-muted-foreground text-sm">
            Les membres classés par ce qu&apos;ils ont fait. Le CEO ouvre une ligne pour voir
            exactement sur quoi la personne travaille.
          </p>
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      <section className="bg-card/60 shadow-soft flex flex-wrap items-center gap-3 rounded-xl border border-border/70 p-3">
        <ArrowDownNarrowWide className="text-muted-foreground ml-1 size-4" aria-hidden />
        <label className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Département</span>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {access.departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Trier par</span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Score de productivité</SelectItem>
              <SelectItem value="done">Tâches terminées</SelectItem>
              <SelectItem value="inflight">Tâches en cours</SelectItem>
              <SelectItem value="name">Nom (A → Z)</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <div className="ml-auto flex items-center gap-4 pr-1 text-xs">
          <Counter label="Actifs" value={totals?.members} />
          <Counter label="Faites" value={totals?.done} tone="emerald" />
          <Counter label="En cours" value={totals?.inFlight} tone="sky" />
          <Counter label="À faire" value={totals?.todo} tone="rose" />
          <Counter label="Score moyen" value={totals?.avgScore} tone="brand" />
        </div>
      </section>

      {stats === null ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : stats.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun membre"
          description="Ajoute des membres sur /team pour voir leur productivité ici."
        />
      ) : (
        <ol className="flex flex-col gap-2">
          {stats.map((entry, index) => (
            <MemberRow
              key={entry.member.id}
              rank={index + 1}
              entry={entry}
              topScore={topScore}
              expanded={expanded.has(entry.member.id)}
              onToggle={() => toggle(entry.member.id)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone?: 'emerald' | 'sky' | 'rose' | 'brand';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'sky'
        ? 'text-sky-600 dark:text-sky-400'
        : tone === 'rose'
          ? 'text-rose-600 dark:text-rose-400'
          : tone === 'brand'
            ? 'text-primary'
            : 'text-foreground';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-semibold ${toneClass}`}>
        {value === undefined ? '—' : value}
      </span>
    </span>
  );
}

function MemberRow({
  rank,
  entry,
  topScore,
  expanded,
  onToggle,
}: {
  rank: number;
  entry: MemberStats;
  topScore: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const effectiveRole = entry.member.role;
  const scoreBar = topScore === 0 ? 0 : Math.round((entry.score / topScore) * 100);
  const Icon = rank === 1 ? Trophy : rank === 2 || rank === 3 ? Medal : null;
  const rankTone =
    rank === 1
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
      : rank === 2
        ? 'bg-slate-400/15 text-slate-700 dark:text-slate-300'
        : rank === 3
          ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
          : 'bg-muted text-muted-foreground';

  return (
    <li>
      <Card>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="hover:bg-muted/30 focus-visible:ring-ring w-full rounded-xl text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="flex items-center gap-3 p-3">
            <span
              className={`${rankTone} inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums`}
            >
              {Icon ? <Icon className="size-3.5" aria-hidden /> : rank}
            </span>

            <Avatar name={entry.member.user.name} seed={entry.member.user.id} size="md" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-foreground truncate text-sm font-semibold">
                  {entry.member.user.name}
                </span>
                <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  {ROLE_LABEL[effectiveRole]}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="bg-muted/60 h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-[width] duration-500"
                    style={{ width: `${scoreBar}%` }}
                  />
                </div>
                <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                  {entry.progressPercent}% faites
                </span>
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-3 text-xs sm:flex">
              <StatPill tone="emerald" label="Done" value={entry.done} />
              <StatPill tone="sky" label="Flight" value={entry.inFlight} />
              <StatPill tone="rose" label="Todo" value={entry.todo} />
            </div>

            <div className="shrink-0 text-right">
              <div className="text-primary flex items-center gap-1 text-lg font-bold tabular-nums">
                <Flame className="size-4" aria-hidden />
                {entry.score}
              </div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                Score
              </div>
            </div>

            {expanded ? (
              <ChevronDown className="text-muted-foreground size-4 shrink-0" aria-hidden />
            ) : (
              <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
            )}
          </div>
        </button>

        {expanded ? <MemberTasks entry={entry} /> : null}
      </Card>
    </li>
  );
}

function StatPill({
  tone,
  label,
  value,
}: {
  tone: 'emerald' | 'sky' | 'rose';
  label: string;
  value: number;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'sky'
        ? 'text-sky-600 dark:text-sky-400'
        : 'text-rose-600 dark:text-rose-400';
  return (
    <span className="inline-flex flex-col items-center">
      <span className={`font-semibold tabular-nums ${toneClass}`}>{value}</span>
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</span>
    </span>
  );
}

function MemberTasks({ entry }: { entry: MemberStats }) {
  if (entry.tasks.length === 0) {
    return (
      <div className="border-border/60 border-t px-5 py-4">
        <p className="text-muted-foreground text-xs">
          <GaugeIcon className="mr-1 inline size-3" aria-hidden />
          Aucune tâche assignée actuellement.
        </p>
      </div>
    );
  }

  const grouped = {
    done: entry.tasks.filter((t) => t.status === 'done'),
    inFlight: entry.tasks.filter((t) => t.status === 'in_progress' || t.status === 'in_review'),
    todo: entry.tasks.filter((t) => t.status === 'backlog' || t.status === 'todo'),
    cancelled: entry.tasks.filter((t) => t.status === 'cancelled'),
  };

  return (
    <div className="border-border/60 flex flex-col gap-3 border-t px-5 py-4">
      {grouped.inFlight.length > 0 ? (
        <TaskGroup title="En cours" tone="sky" icon={TrendingUp} tasks={grouped.inFlight} />
      ) : null}
      {grouped.todo.length > 0 ? (
        <TaskGroup title="À faire" tone="rose" icon={Flame} tasks={grouped.todo} />
      ) : null}
      {grouped.done.length > 0 ? (
        <TaskGroup title="Faites" tone="emerald" icon={Trophy} tasks={grouped.done} />
      ) : null}
    </div>
  );
}

function TaskGroup({
  title,
  tone,
  icon: Icon,
  tasks,
}: {
  title: string;
  tone: 'sky' | 'emerald' | 'rose';
  icon: typeof TrendingUp;
  tasks: IssueRaw[];
}) {
  const toneText =
    tone === 'emerald'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'sky'
        ? 'text-sky-700 dark:text-sky-300'
        : 'text-rose-700 dark:text-rose-300';
  const toneBg =
    tone === 'emerald' ? 'bg-emerald-500/10' : tone === 'sky' ? 'bg-sky-500/10' : 'bg-rose-500/10';
  return (
    <section>
      <div
        className={`${toneText} mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider`}
      >
        <Icon className="size-3.5" aria-hidden />
        {title}
        <span className="text-muted-foreground font-medium tabular-nums">· {tasks.length}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="hover:bg-muted/40 -mx-2 flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors"
          >
            <span
              className={`${toneBg} ${toneText} shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium`}
            >
              {STATUS_LABEL[t.status]}
            </span>
            <span className="min-w-0 flex-1 truncate">{t.title}</span>
            {t.priority !== 'none' ? (
              <span className="text-muted-foreground shrink-0 text-[10px] uppercase">
                {t.priority}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
