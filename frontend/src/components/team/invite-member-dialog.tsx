'use client';

import { CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import * as React from 'react';

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

import { inviteMember, type AppKey, type Role } from './roster-api';

const ROLES: Array<{ value: Role; label: string }> = [
  { value: 'owner', label: 'Owner' },
  { value: 'pm_lead', label: 'PM Lead' },
  { value: 'dev_team_leader', label: 'Dev Team Leader' },
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'viewer', label: 'Viewer' },
];

const APPS: Array<{ id: AppKey; label: string }> = [
  { id: 'axa_admin', label: 'AXA Admin' },
  { id: 'axacrm', label: 'AXA CRM' },
  { id: 'axapass', label: 'AXA Pass' },
  { id: 'website', label: 'Website' },
];

function randomPassword(length = 16): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/**
 * Add a member to the team.
 *
 * One form, one submit: creates the user, the roster row, and the AppOwnership
 * when a team is picked. Returns the plain password back to the admin once —
 * closing the dialog clears it.
 */
export function InviteMemberDialog({
  open,
  onClose,
  onDone,
  defaultTeam,
  defaultRole,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  defaultTeam?: AppKey;
  defaultRole?: Role;
}) {
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState(() => randomPassword());
  const [role, setRole] = React.useState<Role>(defaultRole ?? 'developer');
  const [team, setTeam] = React.useState<AppKey | ''>(defaultTeam ?? '');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ email: string; password: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !name.trim()) return;
    if (password.length < 12) {
      setError('Le mot de passe doit faire au moins 12 caractères.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await inviteMember({
        email: email.trim(),
        name: name.trim(),
        password,
        role,
        team: team || undefined,
      });
      setCreated({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitation échouée.');
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setEmail('');
    setName('');
    setPassword(randomPassword());
    setRole(defaultRole ?? 'developer');
    setTeam(defaultTeam ?? '');
    setError(null);
    setCreated(null);
    onClose();
  }

  if (created) {
    return (
      <Dialog open={open} onOpenChange={(o) => (!o ? (onDone(), close()) : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
              Membre ajouté
            </DialogTitle>
            <DialogDescription>
              Partagez ces identifiants au nouveau membre. Le mot de passe ne sera plus visible
              après fermeture.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 border-border/70 flex flex-col gap-2 rounded-lg border p-3 font-mono text-xs">
            <div>
              <span className="text-muted-foreground">Email : </span>
              <span className="text-foreground">{created.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Password : </span>
              <span className="text-foreground">{created.password}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                onDone();
                close();
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? close() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4" aria-hidden />
            Ajouter un membre à l&apos;équipe
          </DialogTitle>
          <DialogDescription>
            Crée directement l&apos;utilisateur, son rôle et son équipe en un seul appel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Nom</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                placeholder="Fatima Zahra"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@axa.com"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Mot de passe initial</span>
            <div className="flex gap-2">
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={12}
                maxLength={128}
                required
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPassword(randomPassword())}
              >
                Regénérer
              </Button>
            </div>
            <span className="text-muted-foreground text-[11px]">
              Au moins 12 caractères. Partage-le hors écran.
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Rôle</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="bg-background border-input focus-visible:ring-ring h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Équipe (optionnel)</span>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value as AppKey | '')}
                className="bg-background border-input focus-visible:ring-ring h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
              >
                <option value="">Aucune</option>
                {APPS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={close} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserPlus className="size-3.5" />
              )}
              {submitting ? 'Création…' : 'Ajouter le membre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
