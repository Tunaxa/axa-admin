'use client';

import { BarChart3, Building2, CheckCircle2, Clock, Users, XCircle } from 'lucide-react';
import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';

interface Unavailable {
  value: null;
  unavailable: string;
}

interface Kpis {
  window: { from: string; to: string };
  requests: {
    raised: number;
    open: number;
    byStatus: Record<string, number>;
    byApp: Record<string, number>;
  };
  decisions: {
    decided: number;
    approved: number;
    rejected: number;
    sentBack: number;
    approvalRate: number | null;
    hoursToDecision: { median: number | null; p90: number | null };
  };
  payments: {
    checkoutLinksIssued: number;
    paid: Unavailable;
    conversionRate: Unavailable;
  };
}

export function CompanyView() {
  const [kpis, setKpis] = React.useState<Kpis | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    apiFetch<Kpis>('/company/kpis')
      .then((data) => setKpis(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load KPIs'),
      );
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
          <Building2 className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Company</h1>
          <p className="text-muted-foreground text-sm">
            Provisioning pipeline KPIs across the organization.
          </p>
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Raised"
          value={kpis?.requests.raised}
          loading={!kpis}
          hint="in the current window"
        />
        <StatCard
          icon={Clock}
          label="Open"
          value={kpis?.requests.open}
          loading={!kpis}
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={kpis?.decisions.approved}
          loading={!kpis}
          tone="emerald"
        />
        <StatCard
          icon={XCircle}
          label="Rejected"
          value={kpis?.decisions.rejected}
          loading={!kpis}
          tone="rose"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4" aria-hidden />
              Decisions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!kpis ? (
              <>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-2/3" />
              </>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Line
                  label="Decided"
                  value={kpis.decisions.decided}
                />
                <Line
                  label="Approval rate"
                  value={
                    kpis.decisions.approvalRate === null
                      ? '—'
                      : `${Math.round(kpis.decisions.approvalRate * 100)}%`
                  }
                />
                <Line
                  label="Sent back"
                  value={kpis.decisions.sentBack}
                />
                <Line
                  label="Median time"
                  value={fmtHours(kpis.decisions.hoursToDecision.median)}
                />
                <Line
                  label="P90 time"
                  value={fmtHours(kpis.decisions.hoursToDecision.p90)}
                />
                <Line
                  label="Checkout links"
                  value={kpis.payments.checkoutLinksIssued}
                />
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By status</CardTitle>
          </CardHeader>
          <CardContent>
            {!kpis ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {Object.entries(kpis.requests.byStatus).map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between gap-2">
                    <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground tabular-nums">{count}</span>
                  </li>
                ))}
                {Object.keys(kpis.requests.byStatus).length === 0 ? (
                  <li className="text-muted-foreground">No requests in the window.</li>
                ) : null}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>By application</CardTitle>
        </CardHeader>
        <CardContent>
          {!kpis ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(kpis.requests.byApp).map(([app, count]) => (
                <span
                  key={app}
                  className="bg-muted inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                >
                  <span className="text-foreground font-medium">{appLabel(app)}</span>
                  <span className="text-muted-foreground tabular-nums">{count}</span>
                </span>
              ))}
              {Object.keys(kpis.requests.byApp).length === 0 ? (
                <p className="text-muted-foreground text-sm">No requests in the window.</p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {kpis ? (
        <p className="text-muted-foreground text-xs">
          Window: {new Date(kpis.window.from).toLocaleDateString()} →{' '}
          {new Date(kpis.window.to).toLocaleDateString()}
        </p>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  tone = 'default',
  hint,
}: {
  icon: typeof Users;
  label: string;
  value?: number;
  loading: boolean;
  tone?: 'default' | 'amber' | 'rose' | 'emerald';
  hint?: string;
}) {
  const toneClass =
    tone === 'amber'
      ? 'text-amber-600 dark:text-amber-400'
      : tone === 'rose'
        ? 'text-rose-600 dark:text-rose-400'
        : tone === 'emerald'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-foreground';

  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-5">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs uppercase tracking-wide">
          <Icon className="size-3.5" aria-hidden />
          {label}
        </span>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <span className={`text-3xl font-semibold tabular-nums ${toneClass}`}>{value ?? 0}</span>
        )}
        {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </>
  );
}

function fmtHours(h: number | null): string {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
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
