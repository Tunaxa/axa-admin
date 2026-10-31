'use client';

import { CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import * as React from 'react';

import { CredentialsCard } from '@/components/common/credentials-card';
import { useAccess } from '@/components/providers/access-provider';
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
import { randomPassword } from '@/lib/password';

import { inviteMember, type MemberRole } from './roster-api';

const ROLES: Array<{ value: MemberRole; label: string }> = [
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'viewer', label: 'Viewer (lecture seule)' },
];

const selectClass =
  'bg-background border-input focus-visible:ring-ring h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2';

/**
 * Adds a person to a department's team.
 *
 * The CEO picks the department; a manager always adds to their own, so the
 * field is replaced by a fixed label. The backend enforces the same rule: this
 * only keeps the form honest.
 */
export function InviteMemberDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const access = useAccess();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState(() => randomPassword());
  const [role, setRole] = React.useState<MemberRole>('developer');
  const [departmentId, setDepartmentId] = React.useState(access.departments[0]?.id ?? '');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ email: string; password: string } | null>(null);

  const fixedDepartment = access.isCeo ? null : access.department;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await inviteMember({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        departmentId: access.isCeo ? departmentId : undefined,
      });
      setCreated({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajout impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  function finish() {
    if (created) onDone();
    onClose();
  }

  if (created) {
    return (
      <Dialog open={open} onOpenChange={(next) => (!next ? finish() : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
              Membre ajouté
            </DialogTitle>
            <DialogDescription>
              Transmets ces identifiants au nouveau membre. Le mot de passe ne sera plus affiché
              après fermeture.
            </DialogDescription>
          </DialogHeader>
          <CredentialsCard email={created.email} password={created.password} />
          <DialogFooter>
            <Button size="sm" onClick={finish}>
              Terminé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const noDepartment = access.isCeo ? access.departments.length === 0 : !fixedDepartment;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4" aria-hidden />
            Ajouter un membre
          </DialogTitle>
          <DialogDescription>
            Crée le compte et l&apos;ajoute à l&apos;équipe en une seule étape.
          </DialogDescription>
        </DialogHeader>

        {noDepartment ? (
          <p className="text-muted-foreground text-sm">
            {access.isCeo
              ? 'Crée d’abord un département depuis la page Départements.'
              : 'Tu n’es rattaché à aucun département.'}
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Nom</span>
                <Input
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  placeholder="Fatima Zahra"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Email</span>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fatima@entreprise.com"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPassword(randomPassword())}
                >
                  Régénérer
                </Button>
              </div>
              <span className="text-muted-foreground text-[11px]">12 caractères minimum.</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Rôle</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as MemberRole)}
                  className={selectClass}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Département</span>
                {access.isCeo ? (
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
                ) : (
                  <span className="bg-muted/50 border-border/70 flex h-9 items-center rounded-md border px-2 text-sm">
                    {fixedDepartment?.name}
                  </span>
                )}
              </label>
            </div>

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
                  <UserPlus className="size-3.5" />
                )}
                Ajouter le membre
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
