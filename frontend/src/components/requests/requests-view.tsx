'use client';

import {
  CheckCircle2,
  CircleHelp,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  Plus,
  UserPlus,
  XCircle,
} from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import {
  approveRequest,
  createRequest,
  fetchRequests,
  needsMoreInfo,
  rejectRequest,
  type AccountRequest,
  type AccountRequestStatus,
  type AppKey,
} from './requests-api';

const STATUS_FILTERS: Array<{ id: 'all' | AccountRequestStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'needs_more_info', label: 'Needs info' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'withdrawn', label: 'Withdrawn' },
];

const APPS: Array<{ id: AppKey; label: string }> = [
  { id: 'axa_admin', label: 'AXA Admin' },
  { id: 'axacrm', label: 'AXA CRM' },
  { id: 'axapass', label: 'AXA Pass' },
  { id: 'website', label: 'Website' },
];

const STATUS_STYLE: Record<AccountRequestStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  needs_more_info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  rejected: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  withdrawn: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABEL: Record<AccountRequestStatus, string> = {
  pending: 'Pending',
  needs_more_info: 'Needs info',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

type DecisionKind = 'approve' | 'reject' | 'needs_more_info';

export function RequestsView() {
  const [requests, setRequests] = React.useState<AccountRequest[] | null>(null);
  const [filter, setFilter] = React.useState<'all' | AccountRequestStatus>('all');
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [decisionFor, setDecisionFor] = React.useState<
    { request: AccountRequest; kind: DecisionKind } | null
  >(null);

  const load = React.useCallback(() => {
    const query = filter === 'all' ? {} : { status: filter };
    fetchRequests(query)
      .then((rs) => setRequests(rs))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load requests'),
      );
  }, [filter]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRequests(null);
    setError(null);
    load();
  }, [load]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-6">
      <header className="flex items-start gap-3">
        <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
          <UserPlus className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Account requests</h1>
          <p className="text-muted-foreground text-sm">
            Provisioning requests raised for AXA applications — approve, reject, or ask for more
            detail.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New request
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error ? (
        <Card>
          <CardContent className="text-destructive pt-5 text-sm">{error}</CardContent>
        </Card>
      ) : !requests ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground pt-5 text-sm">
            No requests match this filter.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              onDecide={(kind) => setDecisionFor({ request, kind })}
            />
          ))}
        </ul>
      )}

      {createOpen ? (
        <CreateDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      ) : null}

      {decisionFor ? (
        <DecisionDialog
          decision={decisionFor}
          onClose={() => setDecisionFor(null)}
          onDone={() => {
            setDecisionFor(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function RequestRow({
  request,
  onDecide,
}: {
  request: AccountRequest;
  onDecide: (kind: DecisionKind) => void;
}) {
  const isOpen = request.status === 'pending' || request.status === 'needs_more_info';

  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{request.requesterName}</p>
              <p className="text-muted-foreground truncate text-xs">{request.requesterEmail}</p>
            </div>
            <Badge className={`border ${STATUS_STYLE[request.status]}`} variant="outline">
              {STATUS_LABEL[request.status]}
            </Badge>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="bg-muted rounded px-1.5 py-0.5">{appLabel(request.app)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {new Date(request.createdAt).toLocaleDateString()}
            </span>
            {request.decidedAt ? (
              <span className="inline-flex items-center gap-1">
                decided {new Date(request.decidedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>

          {request.note ? (
            <p className="text-foreground/80 bg-muted/40 rounded-md border px-3 py-2 text-sm">
              {request.note}
            </p>
          ) : null}

          {request.decisionNote ? (
            <p className="text-muted-foreground text-xs">
              <span className="font-medium text-foreground">Decision:</span> {request.decisionNote}
            </p>
          ) : null}

          {request.checkoutUrl ? (
            <a
              href={request.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 text-xs underline underline-offset-2"
            >
              Open Stripe checkout <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}

          {isOpen ? (
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => onDecide('needs_more_info')}>
                <CircleHelp className="size-3.5" />
                Needs info
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDecide('reject')}>
                <XCircle className="size-3.5" />
                Reject
              </Button>
              <Button size="sm" onClick={() => onDecide('approve')}>
                <CheckCircle2 className="size-3.5" />
                Approve
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}

function CreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [app, setApp] = React.useState<AppKey>('axa_admin');
  const [requesterName, setRequesterName] = React.useState('');
  const [requesterEmail, setRequesterEmail] = React.useState('');
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createRequest({
        app,
        requesterName: requesterName.trim(),
        requesterEmail: requesterEmail.trim(),
        note: note.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New account request</DialogTitle>
          <DialogDescription>Raise a provisioning request for someone.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 pt-1">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Application</span>
            <select
              className="bg-background h-9 rounded-md border px-2 text-sm"
              value={app}
              onChange={(e) => setApp(e.target.value as AppKey)}
            >
              {APPS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Requester name</span>
            <Input
              required
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="Jane Doe"
              maxLength={120}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Requester email</span>
            <Input
              required
              type="email"
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
              placeholder="jane@customer.com"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Note (optional)</span>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
            />
          </label>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DecisionDialog({
  decision,
  onClose,
  onDone,
}: {
  decision: { request: AccountRequest; kind: DecisionKind };
  onClose: () => void;
  onDone: () => void;
}) {
  const { request, kind } = decision;
  const [note, setNote] = React.useState('');
  const [priceId, setPriceId] = React.useState('');
  const [mode, setMode] = React.useState<'subscription' | 'payment'>('subscription');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const title =
    kind === 'approve'
      ? 'Approve request'
      : kind === 'reject'
        ? 'Reject request'
        : 'Needs more info';
  const noteLabel =
    kind === 'approve'
      ? 'Internal note'
      : kind === 'reject'
        ? 'Rejection reason (sent by email)'
        : 'What is missing (sent by email)';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) {
      setError('A note is required.');
      return;
    }
    if (kind === 'approve' && !/^price_[A-Za-z0-9]+$/.test(priceId.trim())) {
      setError('Enter a valid Stripe price id (price_...).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (kind === 'approve') {
        await approveRequest(request.id, { priceId: priceId.trim(), note: note.trim(), mode });
      } else if (kind === 'reject') {
        await rejectRequest(request.id, note.trim());
      } else {
        await needsMoreInfo(request.id, note.trim());
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {request.requesterName} — {appLabel(request.app)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 pt-1">
          {kind === 'approve' ? (
            <>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Stripe price id</span>
                <Input
                  required
                  value={priceId}
                  onChange={(e) => setPriceId(e.target.value)}
                  placeholder="price_1AbCdE..."
                />
                <span className="text-muted-foreground text-xs">
                  From the Stripe dashboard. Pass a test price while staging.
                </span>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Mode</span>
                <select
                  className="bg-background h-9 rounded-md border px-2 text-sm"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'subscription' | 'payment')}
                >
                  <option value="subscription">Subscription</option>
                  <option value="payment">One-off</option>
                </select>
              </label>
            </>
          ) : null}
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">{noteLabel}</span>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              maxLength={2000}
            />
          </label>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={kind === 'reject' ? 'destructive' : 'default'}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : kind === 'approve' ? (
                <CheckCircle2 className="size-3.5" />
              ) : kind === 'reject' ? (
                <XCircle className="size-3.5" />
              ) : (
                <CircleHelp className="size-3.5" />
              )}
              {submitting ? 'Working…' : title.replace('request', '').trim()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function appLabel(app: AppKey): string {
  switch (app) {
    case 'axa_admin':
      return 'AXA Admin';
    case 'axacrm':
      return 'AXA CRM';
    case 'axapass':
      return 'AXA Pass';
    case 'website':
      return 'Website';
  }
}
