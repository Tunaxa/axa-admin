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
import { Textarea } from '@/components/ui/textarea';

import { provisionRequest, type AccountRequest, type AppKey, type Role } from './requests-api';

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
 * Modal that provisions an internal account from a request.
 *
 * CEO-facing: picks a password (auto or typed), a role and the team the user
 * joins. The team defaults to the request's own app so the common case is one
 * click + submit. After submit the credentials are shown once; closing the
 * dialog clears them.
 */
export function ProvisionDialog({
  request,
  onClose,
  onDone,
}: {
  request: AccountRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = React.useState(() => randomPassword());
  const [role, setRole] = React.useState<Role>('developer');
  const [team, setTeam] = React.useState<AppKey>(request.app);
  const [name, setName] = React.useState(request.requesterName);
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ email: string; password: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 12) {
      setError('Le mot de passe doit faire au moins 12 caractères.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await provisionRequest(request.id, {
        password,
        role,
        team,
        name: name.trim() || undefined,
        decisionNote: note.trim() || undefined,
      });
      setCreated({ email: request.requesterEmail, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création du compte échouée.');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Dialog open onOpenChange={(open) => (!open ? onDone() : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
              Compte créé
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
            <Button size="sm" onClick={onDone}>
              OK
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
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4" aria-hidden />
            Créer un compte utilisateur
          </DialogTitle>
          <DialogDescription>
            Approuve la requête de <strong>{request.requesterEmail}</strong> en créant son compte
            interne.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Nom affiché</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={request.requesterName}
              maxLength={120}
            />
          </label>

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
              Au moins 12 caractères. Partage-le hors écran à l&apos;utilisateur.
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
              <span className="text-muted-foreground">Équipe</span>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value as AppKey)}
                className="bg-background border-input focus-visible:ring-ring h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
              >
                {APPS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Note interne (optionnel)</span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </label>

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserPlus className="size-3.5" />
              )}
              {submitting ? 'Création…' : 'Créer le compte'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
