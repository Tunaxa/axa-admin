'use client';

import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Crown,
  FileText,
  Flame,
  LayoutDashboard,
  Map as MapIcon,
  Network,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchIssues } from '@/components/work/issues-api';
import type { Issue } from '@/components/work/types';
import { apiFetch } from '@/lib/api';

/**
 * Modern SaaS home.
 *
 * Hero greeting, four-tile KPI row with a subtle brand gradient, a wide
 * "Recent" list and a "Jump to" grid. All numbers are live — the stats come
 * from `/issues`, the greeting from `/auth/me` when a session exists.
 */

interface Me {
  sub: string;
  org: string;
  email: string;
}

function greet(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function personFromEmail(email: string | null): string {
  if (!email) return 'there';
  const local = email.split('@')[0] ?? 'there';
  const first = local.split(/[._-]+/)[0] ?? local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

const JUMPS: Array<{ href: string; label: string; icon: typeof CalendarDays; hint: string }> = [
  { href: '/', label: 'Work', icon: LayoutDashboard, hint: 'Issues, projects, kanban' },
  { href: '/executive', label: 'Executive', icon: Crown, hint: 'Delivery by department' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, hint: 'Month, week, day' },
  { href: '/docs', label: 'Docs', icon: FileText, hint: 'Living documentation' },
  { href: '/team', label: 'Team', icon: Users, hint: 'Roster and roles' },
  { href: '/orgchart', label: 'Organigramme', icon: Network, hint: 'Drag-and-drop chart' },
  { href: '/roadmap', label: 'Roadmap', icon: MapIcon, hint: 'Milestones and bets' },
  { href: '/company', label: 'Company', icon: Building2, hint: 'Tenant settings' },
  { href: '/billing', label: 'Billing', icon: CircleDollarSign, hint: 'Plans and invoices' },
];

export function DashboardView() {
  const [me, setMe] = React.useState<Me | null>(null);
  const [issues, setIssues] = React.useState<Issue[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void apiFetch<Me>('/auth/me')
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    void fetchIssues()
      .then((data) => {
        if (!cancelled) setIssues(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load issues');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = React.useMemo(() => {
    if (!issues) return null;
    return {
      total: issues.length,
      open: issues.filter((i) => i.status === 'backlog' || i.status === 'todo').length,
      inProgress: issues.filter((i) => i.status === 'in_progress' || i.status === 'in_review')
        .length,
      done: issues.filter((i) => i.status === 'done').length,
    };
  }, [issues]);

  const recent = React.useMemo(() => (issues ?? []).slice(0, 6), [issues]);

  return (
    <div className="flex flex-col gap-7 p-6 lg:p-8">
      <Hero name={personFromEmail(me?.email ?? null)} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total issues"
          value={stats?.total}
          loading={!stats}
          icon={LayoutDashboard}
          tone="brand"
        />
        <StatTile label="Open" value={stats?.open} loading={!stats} icon={Flame} tone="amber" />
        <StatTile
          label="In progress"
          value={stats?.inProgress}
          loading={!stats}
          icon={Clock}
          tone="sky"
        />
        <StatTile
          label="Shipped"
          value={stats?.done}
          loading={!stats}
          icon={CheckCircle2}
          tone="emerald"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="flex flex-col gap-3 pt-5">
            <SectionHeader
              icon={TrendingUp}
              title="Recent issues"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/">
                    View all
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              }
            />
            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : issues === null ? (
              <div className="grid gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <EmptyState
                icon={LayoutDashboard}
                title="No issues yet"
                description="Create your first issue to see it light up this dashboard."
                action={
                  <Button asChild size="sm">
                    <Link href="/">Open the board</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-border/60 -mx-2 divide-y">
                {recent.map((issue) => (
                  <li key={issue.id} className="group px-2 py-2.5">
                    <Link
                      href="/"
                      className="hover:bg-muted/60 -mx-2 flex items-center gap-3 rounded-md px-2 py-1 transition-colors"
                    >
                      <StatusDot status={issue.status} />
                      <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
                      <span className="text-muted-foreground shrink-0 text-[11px] uppercase tracking-wide">
                        {humanStatus(issue.status)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-3 pt-5">
            <SectionHeader icon={ArrowRight} title="Jump to" />
            <ul className="grid grid-cols-2 gap-1.5">
              {JUMPS.map((j) => {
                const Icon = j.icon;
                return (
                  <li key={j.href}>
                    <Link
                      href={j.href as never}
                      className="hover:bg-muted/70 border-border/60 group flex flex-col gap-0.5 rounded-lg border p-2.5 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="text-primary size-3.5" aria-hidden />
                        <span className="text-sm font-medium">{j.label}</span>
                      </span>
                      <span className="text-muted-foreground truncate text-[11px]">{j.hint}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Hero({ name }: { name: string }) {
  return (
    <section className="shadow-soft from-primary/8 via-primary/4 relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br to-transparent p-6 lg:p-8">
      <div
        className="bg-primary/15 absolute -top-24 -right-16 size-64 rounded-full blur-3xl"
        aria-hidden
      />
      <div
        className="bg-primary/10 absolute -bottom-24 -left-10 size-48 rounded-full blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          {greet()}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back, <span className="text-primary">{name}</span>
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm">
          Here&apos;s what&apos;s happening across your organization today. Press{' '}
          <kbd className="bg-muted/70 rounded border px-1.5 py-0.5 font-mono text-[11px]">⌘K</kbd>{' '}
          to jump anywhere.
        </p>
      </div>
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof TrendingUp;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="text-muted-foreground size-4" aria-hidden />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function StatTile({
  label,
  value,
  loading,
  icon: Icon,
  tone,
}: {
  label: string;
  value?: number;
  loading: boolean;
  icon: typeof LayoutDashboard;
  tone: 'brand' | 'amber' | 'sky' | 'emerald';
}) {
  const toneConf = {
    brand: {
      text: 'text-primary',
      bg: 'bg-primary/10',
      ring: 'from-primary/15',
    },
    amber: {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      ring: 'from-amber-500/15',
    },
    sky: {
      text: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-500/10',
      ring: 'from-sky-500/15',
    },
    emerald: {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      ring: 'from-emerald-500/15',
    },
  }[tone];

  return (
    <Card className="group relative overflow-hidden">
      <div
        className={`${toneConf.ring} absolute inset-0 -z-10 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100`}
        aria-hidden
      />
      <CardContent className="flex items-center gap-3 pt-5">
        <span
          className={`${toneConf.bg} ${toneConf.text} grid size-10 shrink-0 place-items-center rounded-xl`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            {label}
          </span>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-14" />
          ) : (
            <span className={`text-2xl font-semibold tabular-nums ${toneConf.text}`}>
              {value ?? 0}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: string }) {
  const tone =
    status === 'done'
      ? 'bg-emerald-500'
      : status === 'in_progress' || status === 'in_review'
        ? 'bg-sky-500'
        : status === 'cancelled'
          ? 'bg-muted-foreground'
          : 'bg-amber-400';
  return <span className={`size-2 shrink-0 rounded-full ${tone}`} aria-hidden />;
}

function humanStatus(status: string): string {
  return status.replace(/_/g, ' ');
}
