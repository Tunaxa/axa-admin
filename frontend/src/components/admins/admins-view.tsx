'use client';

import { Building2, Crown, ShieldCheck, UserPlus } from 'lucide-react';
import * as React from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteMemberDialog } from '@/components/team/invite-member-dialog';
import { fetchRoster, type AppKey, type Role } from '@/components/team/roster-api';
import type { RosterMember } from '@/components/team/types';

/**
 * CEO-facing admins view.
 *
 * The organization is read as four departments (= AXA applications); each
 * card lists the managers who lead or administer that department. The "Add
 * manager" button opens the invite dialog pre-filled with the department as
 * the team and `dev_team_leader` as the default role.
 */

const DEPARTMENTS: Array<{ app: AppKey; label: string; description: string }> = [
  { app: 'axa_admin', label: 'AXA Admin', description: 'Internal operations platform' },
  { app: 'axacrm', label: 'AXA CRM', description: 'Customer relationship' },
  { app: 'axapass', label: 'AXA Pass', description: 'Identity and access' },
  { app: 'website', label: 'Website', description: 'Public marketing site' },
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

export function AdminsView() {
  const [members, setMembers] = React.useState<RosterMember[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [inviteFor, setInviteFor] = React.useState<AppKey | null>(null);
  const [globalOpen, setGlobalOpen] = React.useState(false);

  const reload = React.useCallback(() => {
    void fetchRoster()
      .then(setMembers)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load admins'),
      );
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const owners = React.useMemo(() => (members ?? []).filter((m) => m.role === 'owner'), [members]);

  function effectiveRole(member: RosterMember, app: AppKey | null): Role {
    if (!app) return member.role as Role;
    const ownership = member.ownerships.find((o) => o.app === app);
    return (ownership?.role ?? member.role) as Role;
  }

  function leadersOf(app: AppKey): RosterMember[] {
    if (!members) return [];
    return members.filter((m) => LEADER_ROLES.has(effectiveRole(m, app)));
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <Crown className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Admins & Managers</h1>
          <p className="text-muted-foreground text-sm">
            Les managers de chaque département. Chaque manager peut ensuite ajouter des membres à
            son équipe.
          </p>
        </div>
        <Button size="sm" onClick={() => setGlobalOpen(true)}>
          <UserPlus className="size-3.5" />
          Créer un admin
        </Button>
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          Direction
        </h2>
        {members === null ? (
          <Skeleton className="h-20 w-full" />
        ) : owners.length === 0 ? (
          <EmptyState
            icon={Crown}
            title="Aucun owner"
            description="Le CEO et les autres propriétaires de l'organisation apparaîtront ici."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {owners.map((owner) => (
              <ManagerPill key={owner.id} member={owner} role="owner" />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          Managers par département
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {DEPARTMENTS.map((dept) => (
            <DepartmentCard
              key={dept.app}
              department={dept}
              leaders={leadersOf(dept.app)}
              effectiveRole={(m) => effectiveRole(m, dept.app)}
              onInvite={() => setInviteFor(dept.app)}
              loading={members === null}
            />
          ))}
        </div>
      </section>

      {inviteFor ? (
        <InviteMemberDialog
          key={inviteFor}
          open
          onClose={() => setInviteFor(null)}
          onDone={() => {
            setInviteFor(null);
            reload();
          }}
          defaultTeam={inviteFor}
          defaultRole="dev_team_leader"
        />
      ) : null}

      {globalOpen ? (
        <InviteMemberDialog
          key="global"
          open
          onClose={() => setGlobalOpen(false)}
          onDone={() => {
            setGlobalOpen(false);
            reload();
          }}
          defaultRole="dev_team_leader"
        />
      ) : null}
    </div>
  );
}

function DepartmentCard({
  department,
  leaders,
  effectiveRole,
  onInvite,
  loading,
}: {
  department: { app: AppKey; label: string; description: string };
  leaders: RosterMember[];
  effectiveRole: (member: RosterMember) => Role;
  onInvite: () => void;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-md">
            <Building2 className="size-4" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-sm">{department.label}</CardTitle>
            <p className="text-muted-foreground text-xs">{department.description}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onInvite}>
          <UserPlus className="size-3.5" />
          Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-14 w-full" />
        ) : leaders.length === 0 ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-3.5" aria-hidden />
            Aucun manager pour ce département.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {leaders.map((member) => (
              <li key={member.id}>
                <ManagerPill member={member} role={effectiveRole(member)} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ManagerPill({ member, role }: { member: RosterMember; role: Role }) {
  return (
    <div className="hover:bg-muted/40 border-border/60 flex items-center gap-3 rounded-md border p-2.5 transition-colors">
      <Avatar name={member.user.name} seed={member.user.id} size="md" />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-foreground truncate text-sm font-medium">{member.user.name}</span>
        <span className="text-muted-foreground truncate text-xs">{member.user.email}</span>
      </div>
      <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">
        {ROLE_LABEL[role]}
      </span>
    </div>
  );
}
