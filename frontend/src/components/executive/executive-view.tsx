'use client';

import {
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  Crown,
  Filter,
  ShieldCheck,
  Users,
} from 'lucide-react';
import * as React from 'react';

import { useAccess, type Department } from '@/components/providers/access-provider';
import { Avatar } from '@/components/ui/avatar';
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
 * Executive overview: the CEO's page.
 *
 * Reads the departments the CEO created, then shows for each how far its
 * projects have come and what its people are doing. Two filters (department,
 * then project) narrow everything below them. Tasks are split between the
 * managers and the rest of the team, each with a traffic light: red when not
 * done, amber when under way, green when done.
 */

type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
type IssuePriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
type Role = 'owner' | 'pm_lead' | 'dev_team_leader' | 'developer' | 'designer' | 'viewer';

interface IssueRaw {
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: string | null;
  projectId: string | null;
  departmentId: string | null;
}

interface RosterEntry {
  id: string;
  role: Role;
  departmentId: string | null;
  user: { id: string; name: string; email: string };
}

interface Project {
  id: string;
  name: string;
  departmentId: string | null;
  completionPercent: number;
}

const MANAGER_ROLES = new Set<Role>(['dev_team_leader', 'pm_lead']);

const STATUS_LABEL: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
  cancelled: 'Cancelled',
};

const isDone = (status: IssueStatus) => status === 'done';
const isInFlight = (status: IssueStatus) => status === 'in_progress' || status === 'in_review';

export function ExecutiveView() {
  const access = useAccess();
  const [issues, setIssues] = React.useState<IssueRaw[] | null>(null);
  const [roster, setRoster] = React.useState<RosterEntry[] | null>(null);
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [dept, setDept] = React.useState<string>('all');
  const [project, setProject] = React.useState<string>('all');

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch<IssueRaw[]>('/issues'),
      apiFetch<RosterEntry[]>('/team-members'),
      apiFetch<Project[]>('/projects'),
    ])
      .then(([i, r, p]) => {
        if (cancelled) return;
        setIssues(i);
        setRoster(r);
        setProjects(p);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Chargement impossible');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Projects offered by the second filter: only those of the chosen department.
  const projectsInScope = React.useMemo(
    () => (projects ?? []).filter((p) => dept === 'all' || p.departmentId === dept),
    [projects, dept],
  );

  // Clamp the project filter when the department filter drops it out of range.
  const activeProject =
    project === 'all' || projectsInScope.some((p) => p.id === project) ? project : 'all';

  const filtered = React.useMemo(() => {
    if (!issues) return null;

    return issues.filter((i) => {
      if (dept !== 'all' && i.departmentId !== dept) return false;
      if (activeProject !== 'all' && i.projectId !== activeProject) return false;
      return true;
    });
  }, [issues, dept, activeProject]);

  const managerIds = React.useMemo(
    () => new Set((roster ?? []).filter((m) => MANAGER_ROLES.has(m.role)).map((m) => m.user.id)),
    [roster],
  );

  const memberTasks = React.useMemo(
    () =>
      filtered ? filtered.filter((t) => !t.assigneeId || !managerIds.has(t.assigneeId)) : null,
    [filtered, managerIds],
  );

  const managers = React.useMemo(() => {
    if (!filtered || !roster) return null;

    return roster
      .filter((m) => MANAGER_ROLES.has(m.role) && (dept === 'all' || m.departmentId === dept))
      .map((manager) => ({
        manager,
        tasks: filtered.filter((t) => t.assigneeId === manager.user.id),
      }));
  }, [filtered, roster, dept]);

  const assigneeName = React.useCallback(
    (id: string | null) => {
      if (!id) return 'Non assignée';

      return roster?.find((r) => r.user.id === id)?.user.name ?? 'Inconnu';
    },
    [roster],
  );

  const departmentOverview = React.useMemo(() => {
    if (!issues || !projects) return null;

    return access.departments
      .filter((d) => dept === 'all' || d.id === dept)
      .map((department) => {
        const tasks = issues.filter((i) => i.departmentId === department.id);
        const deptProjects = projects.filter((p) => p.departmentId === department.id);

        return {
          department,
          total: tasks.length,
          done: tasks.filter((t) => isDone(t.status)).length,
          inFlight: tasks.filter((t) => isInFlight(t.status)).length,
          projectCount: deptProjects.length,
          averageCompletion:
            deptProjects.length === 0
              ? 0
              : Math.round(
                  deptProjects.reduce((sum, p) => sum + p.completionPercent, 0) /
                    deptProjects.length,
                ),
        };
      });
  }, [issues, projects, access.departments, dept]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <Crown className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Executive overview</h1>
          <p className="text-muted-foreground text-sm">
            Suivi des tâches et des projets par département. Rouge = non faite, ambre = en cours,
            verte = terminée.
          </p>
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      <section className="bg-card/60 shadow-soft border-border/70 flex flex-wrap items-center gap-3 rounded-xl border p-3">
        <Filter className="text-muted-foreground ml-1 size-4" aria-hidden />

        <label className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Département</span>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="min-w-44">
              <SelectValue placeholder="Tous les départements" />
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
          <span className="text-muted-foreground">Projet</span>
          <Select value={activeProject} onValueChange={setProject}>
            <SelectTrigger className="min-w-56">
              <SelectValue placeholder="Tous les projets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les projets</SelectItem>
              {projectsInScope.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="ml-auto flex items-center gap-3 pr-1 text-xs">
          <Counter label="Total" value={filtered?.length} />
          <Counter
            label="Faites"
            value={filtered?.filter((t) => isDone(t.status)).length}
            tone="emerald"
          />
          <Counter
            label="En cours"
            value={filtered?.filter((t) => isInFlight(t.status)).length}
            tone="amber"
          />
          <Counter
            label="À faire"
            value={filtered?.filter((t) => t.status === 'backlog' || t.status === 'todo').length}
            tone="rose"
          />
        </div>
      </section>

      <DepartmentsOverview overview={departmentOverview} />

      <ProjectsProgressSection projects={projects === null ? null : projectsInScope} />

      <TasksSection
        icon={Users}
        title="Membres"
        subtitle="Les tâches de l'équipe, hors managers."
        tasks={memberTasks}
        assigneeName={assigneeName}
      />

      <section className="flex flex-col gap-3">
        <SectionTitle
          icon={ShieldCheck}
          title="Managers"
          subtitle="Le manager de chaque département et ses propres tâches."
        />
        {managers === null ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : managers.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Aucun manager"
            description="Crée un département et son manager depuis la page Départements."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {managers.map(({ manager, tasks }) => (
              <ManagerCard
                key={manager.id}
                manager={manager}
                tasks={tasks}
                department={access.departments.find((d) => d.id === manager.departmentId) ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DepartmentsOverview({
  overview,
}: {
  overview: Array<{
    department: Department;
    total: number;
    done: number;
    inFlight: number;
    projectCount: number;
    averageCompletion: number;
  }> | null;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle icon={Boxes} title="Départements" subtitle="Où en est chaque département." />
      {overview === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : overview.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Aucun département"
          description="Crée ton premier département depuis la page Départements."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.map((o) => {
            const percent = o.total === 0 ? 0 : Math.round((o.done / o.total) * 100);

            return (
              <Card key={o.department.id}>
                <CardContent className="flex flex-col gap-3 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{o.department.name}</h3>
                      <p className="text-muted-foreground truncate text-xs">
                        {o.department.manager?.name ?? 'Sans manager'}
                      </p>
                    </div>
                    <span className="text-primary text-lg font-semibold tabular-nums">
                      {o.averageCompletion}%
                    </span>
                  </div>
                  <div className="bg-muted/60 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full transition-[width] duration-500"
                      style={{ width: `${o.averageCompletion}%` }}
                    />
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between text-[11px] tabular-nums">
                    <span>{o.projectCount} projet(s)</span>
                    <span>
                      {o.done}/{o.total} tâches faites · {percent}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone?: 'emerald' | 'amber' | 'rose';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'rose'
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-foreground';

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold tabular-nums ${toneClass}`}>{value ?? '—'}</span>
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
                description="Aucune tâche ne correspond aux filtres."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-border/60 bg-muted/30 text-muted-foreground border-b text-left text-[11px] tracking-wider uppercase">
                    <th className="px-4 py-2 font-medium">Tâche</th>
                    <th className="px-4 py-2 font-medium">Personne assignée</th>
                    <th className="px-4 py-2 font-medium">Statut</th>
                    <th className="w-20 px-4 py-2 text-center font-medium">Progrès</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-border/60 hover:bg-muted/40 border-b transition-colors last:border-b-0"
                    >
                      <td className="px-4 py-2.5">
                        <span className="text-foreground leading-snug font-medium">
                          {task.title}
                        </span>
                        {task.priority !== 'none' ? (
                          <span className="text-muted-foreground block text-[11px] tracking-wide uppercase">
                            Priorité {task.priority}
                          </span>
                        ) : null}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 text-sm">
                        {assigneeName(task.assigneeId)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={task.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-center">
                          <ProgressLight status={task.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function StatusPill({ status }: { status: IssueStatus }) {
  const tone = isDone(status)
    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    : isInFlight(status)
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
      : status === 'cancelled'
        ? 'bg-muted text-muted-foreground'
        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Traffic light: red when not done, amber when under way, green when done. */
function ProgressLight({ status }: { status: IssueStatus }) {
  if (isDone(status)) {
    return (
      <span className="relative inline-flex items-center justify-center" title="Terminée">
        <span className="absolute inline-flex size-4 animate-ping rounded-full bg-emerald-500/40" />
        <span className="relative inline-flex size-3 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
          <CheckCircle2 className="size-2.5 text-white" aria-hidden />
        </span>
      </span>
    );
  }

  if (status === 'cancelled') {
    return <span className="bg-muted-foreground inline-flex size-3 rounded-full" aria-hidden />;
  }

  const colour = isInFlight(status) ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <span
      className={`inline-flex size-3 rounded-full ${colour} shadow-sm`}
      title={isInFlight(status) ? 'En cours' : 'À faire'}
      aria-hidden
    />
  );
}

function ManagerCard({
  manager,
  tasks,
  department,
}: {
  manager: RosterEntry;
  tasks: IssueRaw[];
  department: Department | null;
}) {
  const done = tasks.filter((t) => isDone(t.status)).length;
  const inFlight = tasks.filter((t) => isInFlight(t.status)).length;
  const todo = tasks.length - done - inFlight;
  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  const share = (n: number) => `${(n / Math.max(tasks.length, 1)) * 100}%`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar name={manager.user.name} seed={manager.user.id} size="md" />
          <div>
            <CardTitle className="text-sm">{manager.user.name}</CardTitle>
            <p className="text-muted-foreground text-xs">
              Manager · {department?.name ?? 'Sans département'}
            </p>
          </div>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {done}/{tasks.length} · {percent}%
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="bg-muted flex h-1.5 w-full overflow-hidden rounded-full">
          <div className="h-full bg-emerald-500" style={{ width: share(done) }} />
          <div className="h-full bg-amber-500" style={{ width: share(inFlight) }} />
          <div className="h-full bg-rose-500" style={{ width: share(todo) }} />
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
                <span className="text-muted-foreground shrink-0 text-[11px] tracking-wide uppercase">
                  {STATUS_LABEL[task.status]}
                </span>
              </li>
            ))}
            {tasks.length > 6 ? (
              <li className="text-muted-foreground px-2 pt-1 text-[11px]">
                +{tasks.length - 6} autres tâches
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
      (projects ?? [])
        .map((p) => ({ label: p.name, value: p.completionPercent }))
        .sort((a, b) => b.value - a.value),
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
        subtitle="Pourcentage de complétion défini par le manager de chaque département."
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
              description="Dès qu'un manager crée un projet, son avancement apparaît ici."
            />
          ) : (
            <BarChart data={data} maxRows={10} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
