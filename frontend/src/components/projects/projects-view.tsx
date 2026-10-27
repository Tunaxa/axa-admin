'use client';

import { Loader2, Save, Settings2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchProjects, updateProject, type Project } from '@/components/work/projects-api';

/**
 * Projects management.
 *
 * Each admin lands here to adjust the completion percentage of a project
 * they own; the CEO sees the same table across every project. The percentage
 * is persisted on save (debounce would hit the API after every drag) and the
 * row's progress bar updates optimistically.
 */
export function ProjectsView() {
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    void fetchProjects()
      .then(setProjects)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load projects'),
      );
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  async function onSave(id: string, percent: number) {
    const next = await updateProject(id, { completionPercent: percent });
    setProjects((prev) => (prev ? prev.map((p) => (p.id === id ? next : p)) : prev));
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <Settings2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Projets</h1>
          <p className="text-muted-foreground text-sm">
            Configure l&apos;avancement de chaque projet. Visible par la direction sur
            l&apos;Executive overview.
          </p>
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      {projects === null ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Settings2}
          title="Aucun projet"
          description="Crée des projets depuis le Work module pour piloter leur avancement ici."
        />
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} onSave={onSave} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectRow({
  project,
  onSave,
}: {
  project: Project;
  onSave: (id: string, percent: number) => Promise<void>;
}) {
  const [percent, setPercent] = React.useState(project.completionPercent);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const dirty = percent !== project.completionPercent;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(project.id, percent);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  const tone =
    percent >= 90
      ? 'bg-emerald-500'
      : percent >= 50
        ? 'bg-sky-500'
        : percent >= 25
          ? 'bg-amber-500'
          : 'bg-rose-500';

  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">{project.name}</h3>
              <p className="text-muted-foreground text-xs capitalize">
                Statut : {project.status.replace(/_/g, ' ')}
              </p>
            </div>
            <span className="text-foreground text-xl font-semibold tabular-nums">{percent}%</span>
          </div>

          <div className="bg-muted/60 h-2 w-full overflow-hidden rounded-full">
            <div
              className={`h-full ${tone} transition-[width] duration-200`}
              style={{ width: `${percent}%` }}
              aria-hidden
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="accent-primary flex-1"
              aria-label={`Avancement de ${project.name}`}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={percent}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setPercent(Math.max(0, Math.min(100, Math.round(n))));
              }}
              className="bg-background border-input focus-visible:ring-ring h-8 w-16 rounded-md border px-2 text-right text-sm outline-none focus-visible:ring-2"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
              variant={dirty ? 'default' : 'outline'}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? 'Save…' : dirty ? 'Enregistrer' : savedAt ? 'Enregistré' : 'À jour'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
