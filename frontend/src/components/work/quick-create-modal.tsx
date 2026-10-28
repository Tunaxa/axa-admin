'use client';

import * as React from 'react';

import { useAccess } from '@/components/providers/access-provider';
import { fetchRoster } from '@/components/team/roster-api';
import type { RosterMember } from '@/components/team/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import type { CreateIssueInput } from './issues-api';
import { fetchProjects, type Project } from './projects-api';

const selectClass =
  'bg-background border-input focus-visible:ring-ring h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2';

/**
 * Quick-create modal for a new issue.
 *
 * Title and description only — status, priority and assignee fall back to the
 * schema defaults and are refined in the detail panel. The point of a quick
 * create is to capture the thought without a form standing in the way.
 *
 * Mounted only while it is open, so each open starts from an empty form
 * without an effect resetting state after the fact.
 */
export function QuickCreateModal({
  canCreate,
  onClose,
  onCreate,
}: {
  /** False when the tenant has no workspace to create the issue in. */
  canCreate: boolean;
  onClose: () => void;
  onCreate: (input: Omit<CreateIssueInput, 'workspaceId'>) => Promise<unknown>;
}) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const access = useAccess();
  const canAssign = access.isCeo || access.isManager;
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [people, setPeople] = React.useState<RosterMember[]>([]);
  const [projectId, setProjectId] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState(access.departments[0]?.id ?? '');
  const [assigneeId, setAssigneeId] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    void fetchProjects()
      .then((loaded) => {
        if (!cancelled) setProjects(loaded);
      })
      .catch(() => undefined);

    if (canAssign) {
      void fetchRoster()
        .then((loaded) => {
          if (!cancelled) setPeople(loaded);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [canAssign]);

  // The department the issue will land in: the project's, else the CEO's pick,
  // else the person's own.
  const projectOfIssue = projects.find((p) => p.id === projectId);
  const targetDepartmentId =
    projectOfIssue?.departmentId ?? (access.isCeo ? departmentId : access.departmentId);
  const visibleProjects = projects.filter(
    (p) => !access.isCeo || !departmentId || p.departmentId === departmentId,
  );
  const assignees = people.filter(
    (m) => m.role === 'owner' || !targetDepartmentId || m.departmentId === targetDepartmentId,
  );

  const trimmedTitle = title.trim();

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!trimmedTitle || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onCreate({
        title: trimmedTitle,
        description: description.trim() || undefined,
        projectId: projectId || undefined,
        departmentId: access.isCeo && !projectId ? departmentId || undefined : undefined,
        assigneeId: canAssign && assigneeId ? assigneeId : undefined,
      });
      onClose();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not create the issue');
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New issue</DialogTitle>
            <DialogDescription>
              Give it a title now; status, priority and assignee can be set afterwards.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="quick-create-title" className="text-xs font-medium">
                Title
              </label>
              <Input
                id="quick-create-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Issue title"
                // The modal is opened by a shortcut, so focus has to land here.
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="quick-create-description" className="text-xs font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="quick-create-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Anything worth remembering"
                rows={4}
              />
            </div>

            {access.isCeo ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="quick-create-department" className="text-xs font-medium">
                  Département
                </label>
                <select
                  id="quick-create-department"
                  value={departmentId}
                  onChange={(event) => {
                    setDepartmentId(event.target.value);
                    setProjectId('');
                    setAssigneeId('');
                  }}
                  className={selectClass}
                  required
                >
                  {access.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="quick-create-project" className="text-xs font-medium">
                  Projet <span className="text-muted-foreground">(optional)</span>
                </label>
                <select
                  id="quick-create-project"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className={selectClass}
                >
                  <option value="">Sans projet</option>
                  {visibleProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {canAssign ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="quick-create-assignee" className="text-xs font-medium">
                    Assignée à <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <select
                    id="quick-create-assignee"
                    value={assigneeId}
                    onChange={(event) => setAssigneeId(event.target.value)}
                    className={selectClass}
                  >
                    <option value="">Personne</option>
                    {assignees.map((m) => (
                      <option key={m.id} value={m.user.id}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}

            {!canCreate ? (
              <p role="alert" className="text-destructive text-sm">
                No workspace to create the issue in.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmedTitle || !canCreate || submitting}>
              {submitting ? 'Creating…' : 'Create issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
