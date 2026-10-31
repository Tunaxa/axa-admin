'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { ApiError, apiFetch, AUTH_TOKEN_KEY } from '@/lib/api';

export type Role = 'owner' | 'pm_lead' | 'dev_team_leader' | 'developer' | 'designer' | 'viewer';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  manager: { id: string; name: string; email: string } | null;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

interface PermissionsResponse {
  role: Role | null;
  permissions: string[];
  departmentId: string | null;
}

interface Me {
  sub: string;
  org: string;
  email: string;
}

export interface Access {
  status: 'loading' | 'ready' | 'error';
  me: Me | null;
  role: Role | null;
  permissions: string[];
  departmentId: string | null;
  /** The CEO sees every department; everybody else only their own. */
  departments: Department[];
  /** The caller's own department, when they have one. */
  department: Department | null;
  isCeo: boolean;
  isManager: boolean;
  /** True when no permission is asked for, or the caller holds it. */
  can: (permission?: string) => boolean;
  refreshDepartments: () => Promise<void>;
}

const AccessContext = React.createContext<Access | null>(null);

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'CEO',
  pm_lead: 'Manager',
  dev_team_leader: 'Manager',
  developer: 'Developer',
  designer: 'Designer',
  viewer: 'Viewer',
};

/**
 * Who the signed-in person is and what they may open.
 *
 * Mounted only inside the authenticated shell, so it is created fresh at every
 * sign-in and thrown away at every sign-out: nothing from one account can leak
 * into the next. The backend is the authority on every request; this is what
 * lets the interface hide what a role cannot use.
 */
export function AccessProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<{
    status: Access['status'];
    me: Me | null;
    role: Role | null;
    permissions: string[];
    departmentId: string | null;
    departments: Department[];
  }>({
    status: 'loading',
    me: null,
    role: null,
    permissions: [],
    departmentId: null,
    departments: [],
  });

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch<Me>('/auth/me'),
      apiFetch<PermissionsResponse>('/auth/permissions'),
      apiFetch<Department[]>('/departments').catch(() => [] as Department[]),
    ])
      .then(([me, perms, departments]) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          me,
          role: perms.role,
          permissions: perms.permissions,
          departmentId: perms.departmentId,
          departments,
        });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;

        if (cause instanceof ApiError && cause.status === 401) {
          try {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
          } catch {
            // storage blocked
          }
          router.replace('/login');
          return;
        }

        setState((previous) => ({ ...previous, status: 'error' }));
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const refreshDepartments = React.useCallback(async () => {
    const departments = await apiFetch<Department[]>('/departments');
    setState((previous) => ({ ...previous, departments }));
  }, []);

  const value = React.useMemo<Access>(() => {
    const permissions = new Set(state.permissions);

    return {
      status: state.status,
      me: state.me,
      role: state.role,
      permissions: state.permissions,
      departmentId: state.departmentId,
      departments: state.departments,
      department: state.departments.find((d) => d.id === state.departmentId) ?? null,
      isCeo: state.role === 'owner',
      isManager: state.role === 'dev_team_leader' || state.role === 'pm_lead',
      can: (permission) => !permission || permissions.has(permission),
      refreshDepartments,
    };
  }, [state, refreshDepartments]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): Access {
  const context = React.useContext(AccessContext);

  if (!context) {
    throw new Error('useAccess must be used inside <AccessProvider>');
  }

  return context;
}
