'use client';

import { Activity, CircleDollarSign, TrendingUp, UserPlus } from 'lucide-react';
import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';

interface Snapshot {
  id: string;
  app: 'axa_admin' | 'axacrm' | 'axapass' | 'website';
  periodStart: string;
  periodEnd: string;
  capturedAt: string;
  deploys: number | null;
  errorRate: string | null;
  signups: number | null;
  mrr: string | null;
  currency: string;
}

export function AppUsageView() {
  const [snapshots, setSnapshots] = React.useState<Snapshot[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    apiFetch<Snapshot[]>('/app-usage')
      .then((data) => setSnapshots(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load snapshots'),
      );
  }, []);

  const byApp = React.useMemo(() => {
    if (!snapshots) return null;
    const map = new Map<string, Snapshot[]>();
    for (const s of snapshots) {
      const list = map.get(s.app) ?? [];
      list.push(s);
      map.set(s.app, list);
    }
    return map;
  }, [snapshots]);

  const totals = React.useMemo(() => {
    if (!snapshots) return null;
    const latestByApp = new Map<string, Snapshot>();
    for (const s of snapshots) {
      const existing = latestByApp.get(s.app);
      if (!existing || new Date(s.periodEnd) > new Date(existing.periodEnd)) {
        latestByApp.set(s.app, s);
      }
    }
    const latest = Array.from(latestByApp.values());
    const totalMrr = latest.reduce((acc, s) => acc + (s.mrr ? Number(s.mrr) : 0), 0);
    const totalSignups = snapshots.reduce((acc, s) => acc + (s.signups ?? 0), 0);
    const totalDeploys = snapshots.reduce((acc, s) => acc + (s.deploys ?? 0), 0);
    return { totalMrr, totalSignups, totalDeploys, latest };
  }, [snapshots]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
          <Activity className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">App Usage</h1>
          <p className="text-muted-foreground text-sm">
            Deploys, signups, error rate and MRR across the AXA applications.
          </p>
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={CircleDollarSign}
          label="Current MRR"
          value={totals ? formatMoney(totals.totalMrr) : undefined}
          loading={!totals}
          tone="emerald"
        />
        <StatCard
          icon={UserPlus}
          label="Signups (all time)"
          value={totals?.totalSignups?.toString()}
          loading={!totals}
          tone="sky"
        />
        <StatCard
          icon={TrendingUp}
          label="Deploys (all time)"
          value={totals?.totalDeploys?.toString()}
          loading={!totals}
        />
      </section>

      {!byApp ? (
        <Skeleton className="h-64 w-full" />
      ) : byApp.size === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground pt-5 text-sm">
            No snapshots recorded yet. Ingest readings into <code>app_usage_snapshots</code> to see
            them here.
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {Array.from(byApp.entries()).map(([app, items]) => (
            <AppCard key={app} app={app} snapshots={items} />
          ))}
        </section>
      )}
    </div>
  );
}

function AppCard({ app, snapshots }: { app: string; snapshots: Snapshot[] }) {
  const latest = snapshots[0];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{appLabel(app)}</CardTitle>
        <span className="text-muted-foreground text-xs">{snapshots.length} snapshot(s)</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {latest ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row
              label="MRR"
              value={latest.mrr ? `${formatMoney(Number(latest.mrr))} ${latest.currency}` : '—'}
            />
            <Row label="Signups" value={latest.signups ?? '—'} />
            <Row label="Deploys" value={latest.deploys ?? '—'} />
            <Row
              label="Error rate"
              value={latest.errorRate ? `${(Number(latest.errorRate) * 100).toFixed(2)}%` : '—'}
            />
            <Row
              label="Period"
              value={`${new Date(latest.periodStart).toLocaleDateString()} → ${new Date(latest.periodEnd).toLocaleDateString()}`}
              wide
            />
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  tone = 'default',
}: {
  icon: typeof Activity;
  label: string;
  value?: string;
  loading: boolean;
  tone?: 'default' | 'emerald' | 'sky';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'sky'
        ? 'text-sky-600 dark:text-sky-400'
        : 'text-foreground';
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-5">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs uppercase tracking-wide">
          <Icon className="size-3.5" aria-hidden />
          {label}
        </span>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <span className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value ?? '—'}</span>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <dt className={`text-muted-foreground ${wide ? 'col-span-2' : ''}`}>{label}</dt>
      <dd
        className={`text-right font-medium tabular-nums ${wide ? 'col-span-2 text-left text-xs font-normal' : ''}`}
      >
        {value}
      </dd>
    </>
  );
}

function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

function appLabel(app: string): string {
  switch (app) {
    case 'axa_admin':
      return 'AXA Admin';
    case 'axacrm':
      return 'AXA CRM';
    case 'axapass':
      return 'AXA Pass';
    case 'website':
      return 'Website';
    default:
      return app;
  }
}
