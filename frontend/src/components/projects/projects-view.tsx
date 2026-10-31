'use client';

import { FolderKanban, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import * as React from 'react';

import { useAccess } from '@/components/providers/access-provider';
import { useToast } from '@/components/providers/toast-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
  type Project,
} from '@/components/work/projects-api';

const selectClass =
  'bg-background border-input focus-visible:ring-ring h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2';

/**
 * Projects of a department.
 *
 * The manager creates and runs the projects of their own department; the CEO
 * sees them all. The completion percentage set here is what the CEO reads on
 * the executive overview.
 */
export function ProjectsView() {
  const access = useAccess();
  const toast = useToast();
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const reload = React.useCallback(() => {
    void fetchProjects()
      .then(setProjects)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Impossible de charger les projets'),
      );
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  async function save(id: string, percent: number) {
    const next = await updateProject(id, { completionPercent: percent });

    setProjects((previous) =>
      previous ? previous.map((project) => (project.id === id ? next : project)) : previous,
    );
  }

  async function remove(project: Project) {
    if (!window.confirm(`Supprimer le projet « ${project.name} » ? Ses tâches sont conservées.`)) {
      return;
    }

    try {
      await deleteProject(project.id);
      setProjects((previous) =>
        previous ? previous.filter((p) => p.id !== project.id) : previous,
      );
      void access.refreshDepartments();
    } catch (err) {
      toast.error(
        'Suppression impossible',
        err instanceof Error ? err.message : 'Réessaie dans un instant.',
      );
    }
  }

  const departmentName = (id: string | null) =>
    access.departments.find((d) => d.id === id)?.name ?? null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <FolderKanban className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Projets</h1>
          <p className="text-muted-foreground text-sm">
            {access.isCeo
              ? 'Les projets de tous les départements.'
              : `Les projets du département ${access.department?.name ?? ''}. Mets à jour leur avancement : le CEO le suit.`}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Nouveau projet
        </Button>
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      {projects === null ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet"
          description="Crée un projet pour y regrouper les tâches de ton équipe et suivre son avancement."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              Créer un projet
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              departmentName={access.isCeo ? departmentName(project.departmentId) : null}
              onSave={save}
              onDelete={() => remove(project)}
            />
          ))}
        </ul>
      )}

      {createOpen ? (
        <CreateProjectDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(project) => {
            setProjects((previous) => (previous ? [...previous, project] : [project]));
            void access.refreshDepartments();
          }}
        />
      ) : null}
    </div>
  );
}

function ProjectRow({
  project,
  departmentName,
  onSave,
  onDelete,
}: {
  project: Project;
  departmentName: string | null;
  onSave: (id: string, percent: number) => Promise<void>;
  onDelete: () => void;
}) {
  const [percent, setPercent] = React.useState(project.completionPercent);
  const [saving, setSaving] = React.useState(false);
  const dirty = percent !== project.completionPercent;

  async function handleSave() {
    setSaving(true);

    try {
      await onSave(project.id, percent);
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
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{project.name}</h3>
                {departmentName ? (
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                    {departmentName}
                  </span>
                ) : null}
              </div>
              {project.description ? (
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                  {project.description}
                </p>
              ) : null}
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
              {dirty ? 'Enregistrer' : 'À jour'}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label={`Supprimer ${project.name}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function CreateProjectDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const access = useAccess();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState(access.departments[0]?.id ?? '');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const noDepartment = access.isCeo && access.departments.length === 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        departmentId: access.isCeo ? departmentId : undefined,
      });
      onCreated(project);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
          <DialogDescription>
            {access.isCeo
              ? 'Choisis le département qui porte ce projet.'
              : `Le projet sera rattaché à ${access.department?.name ?? 'ton département'}.`}
          </DialogDescription>
        </DialogHeader>

        {noDepartment ? (
          <p className="text-muted-foreground text-sm">
            Crée d&apos;abord un département depuis la page Départements.
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Nom du projet</span>
              <Input
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                placeholder="Refonte de l'API"
              />
            </label>

            {access.isCeo ? (
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Département</span>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className={selectClass}
                >
                  {access.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Description (optionnel)</span>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </label>

            {error ? (
              <p className="text-destructive text-xs" role="alert">
                {error}
              </p>
            ) : null}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Créer le projet
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
