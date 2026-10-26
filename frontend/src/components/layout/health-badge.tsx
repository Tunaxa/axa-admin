'use client';

import * as React from 'react';
import { cn } from 'cn';

import { apiFetch } from '@/lib/api';

type Health = 'ok' | 'checking' | 'down';

const INTERVAL = 30_000;

export function HealthBadge() {
  const [status, setStatus] = React.useState<Health>('checking');

  React.useEffect(() => {
    let cancelled = false;
    async function ping() {
      try {
        await apiFetch<unknown>('/');
        if (!cancelled) setStatus('ok');
      } catch {
        if (!cancelled) setStatus('down');
      }
    }
    void ping();
    const id = window.setInterval(ping, INTERVAL);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const tone =
    status === 'ok' ? 'bg-emerald-500' : status === 'checking' ? 'bg-amber-500' : 'bg-destructive';
  const label =
    status === 'ok' ? 'API online' : status === 'checking' ? 'Connecting…' : 'API offline';

  return (
    <span
      role="status"
      title={label}
      className={cn(
        'text-muted-foreground border-border/80 bg-background/60 hidden items-center gap-1.5 rounded-full border px-2 py-1 text-xs backdrop-blur md:inline-flex',
      )}
    >
      <span className="relative flex size-1.5">
        <span
          className={cn('absolute inline-flex size-full rounded-full opacity-70', tone, status === 'ok' && 'animate-ping')}
        />
        <span className={cn('relative inline-flex size-1.5 rounded-full', tone)} aria-hidden />
      </span>
      <span>{label}</span>
    </span>
  );
}
