'use client';

import {
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  PieChart,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import * as React from 'react';

import { BarChart } from '@/components/ui/charts/bar-chart';
import { DonutChart } from '@/components/ui/charts/donut-chart';
import { Gauge } from '@/components/ui/charts/gauge';
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

  const statusData = React.useMemo(() => {
    if (!kpis) return [];
    return Object.entries(kpis.requests.byStatus).map(([label, value]) => ({
      label: label.replace(/_/g, ' '),
      value,
    }));
  }, [kpis]);

  const appData = React.useMemo(() => {
    if (!kpis) return [];
    return Object.entries(kpis.requests.byApp).map(([label, value]) => ({
      label: appLabel(label),
      value,
    }));
  }, [kpis]);

  const decisionsData = React.useMemo(() => {
    if (!kpis) return [];
    return [
      { label: 'Approved', value: kpis.decisions.approved },
      { label: 'Rejected', value: kpis.decisions.rejected },
      { label: 'Sent back', value: kpis.decisions.sentBack },
    ].filter((d) => d.value > 0);
  }, [kpis]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <Building2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Company</h1>
          <p className="text-muted-foreground text-sm">
            KPIs du pipeline de provisioning sur la période courante.
          </p>
        </div>
        {kpis ? (
          <span className="text-muted-foreground border-border/70 rounded-full border px-2.5 py-1 text-xs">
            {new Date(kpis.window.from).toLocaleDateString()} →{' '}
            {new Date(kpis.window.to).toLocaleDateString()}
          </span>
        ) : null}
      </header>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Raised" value={kpis?.requests.raised} loading={!kpis} />
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

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="size-4" aria-hidden />
              Requêtes par statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!kpis ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DonutChart data={statusData} centreLabel="Requêtes" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="size-4" aria-hidden />
              Décisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!kpis ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DonutChart data={decisionsData} centreLabel="Décisions" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" aria-hidden />
              Taux d&apos;approbation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {!kpis ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <Gauge
                  value={kpis.decisions.approvalRate}
                  label="Approved / decided"
                  tone={
                    kpis.decisions.approvalRate === null
                      ? 'brand'
                      : kpis.decisions.approvalRate >= 0.7
                        ? 'emerald'
                        : kpis.decisions.approvalRate >= 0.4
                          ? 'amber'
                          : 'rose'
                  }
                />
                <div className="grid w-full grid-cols-2 gap-3 text-xs">
                  <HoursLine
                    label="Temps médian"
                    value={fmtHours(kpis.decisions.hoursToDecision.median)}
                  />
                  <HoursLine label="P90" value={fmtHours(kpis.decisions.hoursToDecision.p90)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4" aria-hidden />
              Requêtes par application
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!kpis ? <Skeleton className="h-32 w-full" /> : <BarChart data={appData} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" aria-hidden />
              Paiements
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!kpis ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Liens Stripe émis
                  </span>
                  <span className="text-foreground text-2xl font-semibold tabular-nums">
                    {kpis.payments.checkoutLinksIssued}
                  </span>
                </div>
                <p className="text-muted-foreground rounded-md border border-dashed p-2.5 text-[11px] leading-relaxed">
                  Paiements confirmés et taux de conversion indisponibles :{' '}
                  {kpis.payments.paid.unavailable}.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  tone = 'default',
}: {
  icon: typeof Users;
  label: string;
  value?: number;
  loading: boolean;
  tone?: 'default' | 'amber' | 'rose' | 'emerald';
}) {
  const toneBg =
    tone === 'amber'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : tone === 'rose'
        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        : tone === 'emerald'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-primary/10 text-primary';
  const toneText =
    tone === 'amber'
      ? 'text-amber-600 dark:text-amber-400'
      : tone === 'rose'
        ? 'text-rose-600 dark:text-rose-400'
        : tone === 'emerald'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-foreground';

  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        <span className={`${toneBg} grid size-10 shrink-0 place-items-center rounded-xl`}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            {label}
          </span>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-14" />
          ) : (
            <span className={`text-2xl font-semibold tabular-nums ${toneText}`}>{value ?? 0}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HoursLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/60 bg-muted/30 flex flex-col gap-0.5 rounded-md border p-2">
      <span className="text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-foreground font-semibold tabular-nums">{value}</span>
    </div>
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
