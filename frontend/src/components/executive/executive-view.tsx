'use client';

import {
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Crown,
  Filter,
  ShieldCheck,
  Users,
} from 'lucide-react';
import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from '@/components/ui/charts/bar-chart';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';

/**
 * Executive overview.
 *
 * CEO-facing: two filters at the top (department = AXA application, project),
 * then two sections — one row per task:
 *
 *  - "Membres" lists tasks whose assignee is a contributor (developer /
 *    designer / viewer or unassigned)
 *  - "Admins" lists tasks whose assignee holds a leadership role (owner,
 *    pm_lead, dev_team_leader)
 *
 * Each row has a traffic light: red for not done, green for done. Tasks the
 * team is working on glow amber so a reviewer can tell apart "haven't started"
 * from "in flight".
 */

type AppKey = 'axa_admin' | 'axacrm' | 'axapass' | 'website';
type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
type IssuePriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
type Role = 'owner' | 'pm_lead' | 'dev_team_leader' | 'developer' | 'designer' | 'viewer';

interface IssueRaw {
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  app: AppKey | null;
  assigneeId: string | null;
  projectId: string | null;
  createdAt: string;
  closedAt: string | null;
}

interface RosterEntry {
  id: string;
  role: Role;
  user: { id: string; name: string; email: string };
  ownerships: { app: AppKey; role: Role }[];
}

interface Project {
  id: string;
  name: string;
  status: string;
  workspaceId: string;
  completionPercent: number;
}

const DEPARTMENTS: Array<{ app: AppKey; label: string }> = [
  { app: 'axa_admin', label: 'AXA Admin' },
  { app: 'axacrm', label: 'AXA CRM' },
  { app: 'axapass', label: 'AXA Pass' },
  { app: 'website', label: 'Website' },
];

const LEADER_ROLES = new Set<Role>(['owner', 'pm_lead', 'dev_team_leader']);
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

/** Returns the role the member has for an app — the override, else the base. */
function effectiveRole(member: RosterEntry, app: AppKey | null): Role {
  if (!app) return member.role;
  return member.ownerships.find((o) => o.app === app)?.role ?? member.role;
}

function isLeader(member: RosterEntry, app: AppKey | null): boolean {
  return LEADER_ROLES.has(effectiveRole(member, app));
}

export function ExecutiveView() {
  const [issues, setIssues] = React.useState<IssueRaw[] | null>(null);
  const [roster, setRoster] = React.useState<RosterEntry[] | null>(null);
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [dept, setDept] = React.useState<'all' | AppKey>('all');
  const [project, setProject] = React.useState<string>('all');

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<IssueRaw[]>('/issues'),
      apiFetch<RosterEntry[]>('/team-members'),
      apiFetch<Project[]>('/projects').catch(() => [] as Project[]),
    ])
      .then(([i, r, p]) => {
        if (cancelled) return;
        setIssues(i);
        setRoster(r);
        setProjects(p);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load the executive view');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availableProjects = React.useMemo(() => {
    if (!projects) return [];
    // Filter projects to those that have at least one issue in the chosen
    // department — a project list that proposes empties is just noise.
    if (dept === 'all') return projects;
    const projectIdsInDept = new Set(
      (issues ?? []).filter((i) => i.app === dept && i.projectId).map((i) => i.projectId!),
    );
    return projects.filter((p) => projectIdsInDept.has(p.id));
  }, [projects, issues, dept]);

  // Clamp the project filter when the dept picker drops it out of range —
  // derived during render rather than synced from an effect.
  const activeProject =
    project === 'all' || availableProjects.some((p) => p.id === project) ? project : 'all';

  const filtered = React.useMemo(() => {
    if (!issues) return null;
    return issues.filter((i) => {
      if (dept !== 'all' && i.app !== dept) return false;
      if (activeProject !== 'all' && i.projectId !== activeProject) return false;
      return true;
    });
  }, [issues, dept, activeProject]);

  const memberTasks = React.useMemo(() => {
    if (!filtered || !roster) return null;
    return filtered.filter((t) => {
      if (!t.assigneeId) return true; // unassigned → shown with the members
      const member = roster.find((r) => r.user.id === t.assigneeId);
      return !member || !isLeader(member, t.app);
    });
  }, [filtered, roster]);

  const adminGroups = React.useMemo(() => {
    if (!filtered || !roster) return null;
    const admins = roster.filter((m) => {
      // A roster member is admin for THIS view if they're a leader on the
      // current department (or on any department when "All departments").
      if (dept === 'all') {
        return LEADER_ROLES.has(m.role) || m.ownerships.some((o) => LEADER_ROLES.has(o.role));
      }
      return isLeader(m, dept);
    });

    return (
      admins
        .map((admin) => ({
          admin,
          tasks: filtered.filter((t) => t.assigneeId === admin.user.id),
        }))
        // Admins with tasks first, then alphabetical.
        .sort((a, b) => {
          if (a.tasks.length !== b.tasks.length) return b.tasks.length - a.tasks.length;
          return a.admin.user.name.localeCompare(b.admin.user.name);
        })
    );
  }, [filtered, roster, dept]);

  const assigneeName = React.useCallback(
    (id: string | null): string => {
      if (!id) return 'Unassigned';
      const match = roster?.find((r) => r.user.id === id);
      return match ? match.user.name : 'Unknown';
    },
    [roster],
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <Crown className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Executive overview</h1>
          <p className="text-muted-foreground text-sm">
            Suivi des tâches par département et par projet. Rouge = non faite, verte = terminée.
          </p>
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      <section className="bg-card/60 shadow-soft flex flex-wrap items-center gap-3 rounded-xl border border-border/70 p-3">
        <Filter className="text-muted-foreground ml-1 size-4" aria-hidden />
        <FilterGroup label="Département">
          <Select value={dept} onValueChange={(v) => setDept(v as 'all' | AppKey)}>
            <SelectTrigger className="min-w-44">
              <SelectValue placeholder="Tous les départements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d.app} value={d.app}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterGroup>

        <FilterGroup label="Projet">
          <Select value={activeProject} onValueChange={setProject}>
            <SelectTrigger className="min-w-56">
              <SelectValue placeholder="Tous les projets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les projets</SelectItem>
              {availableProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterGroup>

        <div className="ml-auto flex items-center gap-3 pr-1 text-xs">
          <Counter label="Total" value={filtered?.length} />
          <Counter
            label="Faites"
            value={filtered?.filter((t) => t.status === 'done').length}
            tone="emerald"
          />
          <Counter
            label="En cours"
            value={
              filtered?.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length
            }
            tone="sky"
          />
          <Counter
            label="À faire"
            value={filtered?.filter((t) => t.status === 'backlog' || t.status === 'todo').length}
            tone="rose"
          />
        </div>
      </section>

      <ProjectsProgressSection projects={projects} />

      <TasksSection
        icon={Users}
        title="Membres"
        subtitle="Les tâches affectées aux contributeurs et aux rôles opérationnels."
        tasks={memberTasks}
        assigneeName={assigneeName}
      />

      <section className="flex flex-col gap-3">
        <SectionTitle
          icon={ShieldCheck}
          title="Admins"
          subtitle="Chaque leader de département et ses tâches."
        />
        {adminGroups === null ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : adminGroups.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Aucun admin"
            description="Aucun rôle de leadership n'a encore été attribué pour ce filtre."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {adminGroups.map(({ admin, tasks }) => (
              <AdminCard
                key={admin.id}
                admin={admin}
                tasks={tasks}
                dept={dept === 'all' ? null : dept}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone?: 'emerald' | 'sky' | 'rose';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'sky'
        ? 'text-sky-600 dark:text-sky-400'
        : tone === 'rose'
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-foreground';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-semibold ${toneClass}`}>{value ?? '—'}</span>
    </span>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Users;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="text-muted-foreground mt-0.5 size-4" aria-hidden />
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-muted-foreground text-xs">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function TasksSection({
  icon,
  title,
  subtitle,
  tasks,
  assigneeName,
}: {
  icon: typeof Users;
  title: string;
  subtitle?: string;
  tasks: IssueRaw[] | null;
  assigneeName: (id: string | null) => string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle icon={icon} title={title} subtitle={subtitle} />
      <Card>
        <CardContent className="p-0">
          {tasks === null ? (
            <div className="grid gap-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={icon}
                title="Aucune tâche"
                description="Aucune tâche ne correspond au filtre pour cette section."
              />
            </div>
          ) : (
            <TasksTable tasks={tasks} assigneeName={assigneeName} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function TasksTable({
  tasks,
  assigneeName,
}: {
  tasks: IssueRaw[];
  assigneeName: (id: string | null) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-border/60 bg-muted/30 text-muted-foreground border-b text-left text-[11px] uppercase tracking-wider">
            <th className="px-4 py-2 font-medium">Tâche</th>
            <th className="px-4 py-2 font-medium">Personne assignée</th>
            <th className="px-4 py-2 font-medium">Statut</th>
            <th className="w-20 px-4 py-2 text-center font-medium">Progrès</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} assigneeName={assigneeName(t.assigneeId)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskRow({ task, assigneeName }: { task: IssueRaw; assigneeName: string }) {
  return (
    <tr className="border-border/60 hover:bg-muted/40 border-b last:border-b-0 transition-colors">
      <td className="px-4 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground font-medium leading-snug">{task.title}</span>
          {task.priority !== 'none' ? (
            <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
              Priorité {task.priority}
            </span>
          ) : null}
        </div>
      </td>
      <td className="text-muted-foreground px-4 py-2.5 text-sm">{assigneeName}</td>
      <td className="px-4 py-2.5">
        <StatusPill status={task.status} />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex justify-center">
          <ProgressLight status={task.status} />
        </div>
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: IssueStatus }) {
  const tone =
    status === 'done'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : status === 'in_progress' || status === 'in_review'
        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
        : status === 'cancelled'
          ? 'bg-muted text-muted-foreground'
          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Traffic light.
 *
 * Red when the task hasn't been done (backlog / todo / in_progress / in_review),
 * green when done. Amber shade on "in progress" so the viewer can read it as
 * "started but not finished" at a glance. Cancelled renders grey so a
 * reviewer doesn't confuse it with a shipped item.
 */
function ProgressLight({ status }: { status: IssueStatus }) {
  if (status === 'done') {
    return (
      <span className="relative inline-flex items-center justify-center">
        <span className="absolute inline-flex size-4 animate-ping rounded-full bg-emerald-500/40" />
        <span className="relative inline-flex size-3 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
          <CheckCircle2 className="size-2.5 text-white" aria-hidden />
        </span>
      </span>
    );
  }
  if (status === 'cancelled') {
    return <span className="inline-flex size-3 rounded-full bg-muted-foreground" aria-hidden />;
  }
  const inFlight = status === 'in_progress' || status === 'in_review';
  const colour = inFlight ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <span
      className={`inline-flex size-3 rounded-full ${colour} shadow-sm`}
      title={inFlight ? 'En cours' : 'À faire'}
      aria-hidden
    />
  );
}

function AdminCard({
  admin,
  tasks,
  dept,
}: {
  admin: RosterEntry;
  tasks: IssueRaw[];
  dept: AppKey | null;
}) {
  const role = effectiveRole(admin, dept);
  const done = tasks.filter((t) => t.status === 'done').length;
  const inFlight = tasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'in_review',
  ).length;
  const todo = tasks.length - done - inFlight;
  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-full text-xs font-semibold">
            {admin.user.name
              .split(/\s+/)
              .map((p) => p[0] ?? '')
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div>
            <CardTitle className="text-sm">{admin.user.name}</CardTitle>
            <p className="text-muted-foreground text-xs">{ROLE_LABEL[role]}</p>
          </div>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {done}/{tasks.length} · {percent}%
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="bg-muted flex h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-emerald-500 h-full"
            style={{ width: `${(done / Math.max(tasks.length, 1)) * 100}%` }}
          />
          <div
            className="bg-amber-500 h-full"
            style={{ width: `${(inFlight / Math.max(tasks.length, 1)) * 100}%` }}
          />
          <div
            className="bg-rose-500 h-full"
            style={{ width: `${(todo / Math.max(tasks.length, 1)) * 100}%` }}
          />
        </div>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            <Clock className="mr-1 inline size-3" aria-hidden />
            Aucune tâche sur ce filtre.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {tasks.slice(0, 6).map((task) => (
              <li
                key={task.id}
                className="hover:bg-muted/50 -mx-2 flex items-center gap-2.5 rounded-md px-2 py-1 transition-colors"
              >
                <ProgressLight status={task.status} />
                <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                <span className="text-muted-foreground shrink-0 text-[11px] uppercase tracking-wide">
                  {STATUS_LABEL[task.status]}
                </span>
              </li>
            ))}
            {tasks.length > 6 ? (
              <li className="text-muted-foreground px-2 pt-1 text-[11px]">
                <Building2 className="mr-1 inline size-3" aria-hidden />+{tasks.length - 6} autres
                tâches
              </li>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectsProgressSection({ projects }: { projects: Project[] | null }) {
  const data = React.useMemo(
    () =>
      projects
        ? projects
            .map((p) => ({ label: p.name, value: p.completionPercent }))
            .sort((a, b) => b.value - a.value)
        : [],
    [projects],
  );

  const average =
    projects && projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.completionPercent, 0) / projects.length)
      : 0;

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle
        icon={BarChart3}
        title="Avancement des projets"
        subtitle="Pourcentage de complétion défini par chaque admin."
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">Par projet</CardTitle>
          {projects ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              Moyenne {average}% · {projects.length} {projects.length > 1 ? 'projets' : 'projet'}
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {projects === null ? (
            <Skeleton className="h-28 w-full" />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Aucun projet"
              description="Dès qu'un projet est créé, son avancement apparait ici."
            />
          ) : (
            <BarChart data={data} maxRows={8} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
