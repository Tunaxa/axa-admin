'use client';

import { Boxes, CheckCircle2, Loader2, Plus, Trash2, UserCog, Users } from 'lucide-react';
import * as React from 'react';

import { CredentialsCard } from '@/components/common/credentials-card';
import { useAccess, type Department } from '@/components/providers/access-provider';
import { useToast } from '@/components/providers/toast-provider';
import { Avatar } from '@/components/ui/avatar';
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
import { Textarea } from '@/components/ui/textarea';
import { randomPassword } from '@/lib/password';

import {
  createDepartment,
  deleteDepartment,
  setDepartmentManager,
  type ManagerAccountInput,
} from './departments-api';

/**
 * Departments: the CEO's page.
 *
 * Creating a department and naming its manager is one gesture, because a
 * department without somebody running it cannot do anything: the manager is
 * the person who then creates its projects and adds its people.
 */
export function DepartmentsView() {
  const access = useAccess();
  const toast = useToast();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [managerFor, setManagerFor] = React.useState<Department | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const departments = access.departments;

  async function remove(department: Department) {
    if (!window.confirm(`Supprimer le département « ${department.name} » ?`)) return;

    setDeleting(department.id);

    try {
      await deleteDepartment(department.id);
      await access.refreshDepartments();
      toast.success('Département supprimé', department.name);
    } catch (err) {
      toast.error(
        'Suppression impossible',
        err instanceof Error ? err.message : 'Réessaie dans un instant.',
      );
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <Boxes className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Départements</h1>
          <p className="text-muted-foreground text-sm">
            Crée les départements de l&apos;entreprise et nomme leur manager. Le manager crée
            ensuite les projets et ajoute les membres de son équipe.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Nouveau département
        </Button>
      </header>

      {departments.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Aucun département"
          description="Commence par créer un département, par exemple Développement ou Marketing, avec son manager."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              Créer le premier département
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {departments.map((department) => (
            <li key={department.id}>
              <Card>
                <CardContent className="flex flex-col gap-4 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{department.name}</h2>
                      {department.description ? (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                          {department.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden />
                        {department.memberCount}
                      </span>
                      <span>{department.projectCount} projet(s)</span>
                    </div>
                  </div>

                  <div className="border-border/60 bg-muted/30 flex items-center gap-3 rounded-lg border p-2.5">
                    {department.manager ? (
                      <>
                        <Avatar
                          name={department.manager.name}
                          seed={department.manager.id}
                          size="md"
                        />
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="truncate text-sm font-medium">
                            {department.manager.name}
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            {department.manager.email}
                          </div>
                        </div>
                        <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                          Manager
                        </span>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Aucun manager pour ce département.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setManagerFor(department)}>
                      <UserCog className="size-3.5" />
                      {department.manager ? 'Changer le manager' : 'Nommer un manager'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={deleting === department.id}
                      onClick={() => remove(department)}
                    >
                      {deleting === department.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <CreateDepartmentDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => void access.refreshDepartments()}
        />
      ) : null}

      {managerFor ? (
        <ChangeManagerDialog
          department={managerFor}
          onClose={() => setManagerFor(null)}
          onChanged={() => void access.refreshDepartments()}
        />
      ) : null}
    </div>
  );
}

/** Name, email and password of the person who will run a department. */
function ManagerFields({
  value,
  onChange,
}: {
  value: ManagerAccountInput;
  onChange: (next: ManagerAccountInput) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Nom du manager</span>
          <Input
            required
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            maxLength={120}
            placeholder="Karim Benali"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Email</span>
          <Input
            required
            type="email"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
            placeholder="karim@entreprise.com"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Mot de passe initial</span>
        <div className="flex gap-2">
          <Input
            required
            minLength={12}
            maxLength={128}
            value={value.password}
            onChange={(e) => onChange({ ...value, password: e.target.value })}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...value, password: randomPassword() })}
          >
            Régénérer
          </Button>
        </div>
        <span className="text-muted-foreground text-[11px]">
          12 caractères minimum. Tu le transmets au manager, qui pourra s&apos;en servir pour se
          connecter.
        </span>
      </label>
    </div>
  );
}

const emptyManager = (): ManagerAccountInput => ({
  name: '',
  email: '',
  password: randomPassword(),
});

function CreateDepartmentDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [manager, setManager] = React.useState<ManagerAccountInput>(emptyManager);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<ManagerAccountInput | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createDepartment({
        name: name.trim(),
        description: description.trim() || undefined,
        manager: { ...manager, name: manager.name.trim(), email: manager.email.trim() },
      });
      onCreated();
      setCreated(manager);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
              Département créé
            </DialogTitle>
            <DialogDescription>
              Transmets ces identifiants au manager. Le mot de passe ne sera plus affiché après
              fermeture.
            </DialogDescription>
          </DialogHeader>
          <CredentialsCard email={created.email} password={created.password} />
          <DialogFooter>
            <Button size="sm" onClick={onClose}>
              Terminé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau département</DialogTitle>
          <DialogDescription>
            Le manager reçoit un compte et dirige ce département : projets, équipe, suivi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Nom du département</span>
              <Input
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Développement"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Description (optionnel)</span>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </label>
          </div>

          <div className="border-border/60 border-t pt-4">
            <ManagerFields value={manager} onChange={setManager} />
          </div>

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Créer le département
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeManagerDialog({
  department,
  onClose,
  onChanged,
}: {
  department: Department;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [manager, setManager] = React.useState<ManagerAccountInput>(emptyManager);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<ManagerAccountInput | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await setDepartmentManager(department.id, {
        account: { ...manager, name: manager.name.trim(), email: manager.email.trim() },
      });
      onChanged();
      setCreated(manager);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Changement impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
              Nouveau manager nommé
            </DialogTitle>
            <DialogDescription>
              L&apos;ancien manager reste dans le département comme développeur.
            </DialogDescription>
          </DialogHeader>
          <CredentialsCard email={created.email} password={created.password} />
          <DialogFooter>
            <Button size="sm" onClick={onClose}>
              Terminé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manager de « {department.name} »</DialogTitle>
          <DialogDescription>
            Crée le compte de la personne qui prend la tête du département.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <ManagerFields value={manager} onChange={setManager} />

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserCog className="size-3.5" />
              )}
              Nommer ce manager
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
