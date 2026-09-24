'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIssuesContext } from '@/components/work/issues-provider';

import { fetchMe, fetchReport, submitReport, todayIso } from './daily-reports-api';

/**
 * Daily report form.
 *
 * Submitting is a `PUT`, which replaces the whole report — so the form loads
 * whatever was already filed for the chosen day first. Without that, opening
 * the page and saving would quietly wipe an earlier update.
 */
export function DailyReportForm() {
  const [date, setDate] = React.useState(todayIso());
  const [authorId, setAuthorId] = React.useState<string | null>(null);
  const [authorError, setAuthorError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetchMe()
      .then((claims) => {
        if (!cancelled) setAuthorId(claims.sub);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setAuthorError(cause instanceof Error ? cause.message : 'Could not identify you');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (authorError) {
    return (
      <div className="p-4">
        <p role="alert" className="text-destructive text-sm">
          {authorError}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Daily reports read the API at <code className="font-mono">NEXT_PUBLIC_API_URL</code> and
          need a signed-in session.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <header className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Daily report</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          What you shipped, what is blocking you, and what is next.
        </p>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="report-date" className="text-muted-foreground text-xs font-medium">
          Day
        </label>
        <Input
          id="report-date"
          type="date"
          value={date}
          max={todayIso()}
          onChange={(event) => setDate(event.target.value)}
          className="w-44"
        />
      </div>

      {authorId ? (
        // Keyed so changing the day remounts with that day's values, rather
        // than an effect writing over what is on screen.
        <ReportFields key={`${authorId}:${date}`} date={date} authorId={authorId} />
      ) : (
        <p className="text-muted-foreground text-sm">Loading…</p>
      )}
    </div>
  );
}

type FormState = 'loading' | 'ready' | 'failed';

function ReportFields({ date, authorId }: { date: string; authorId: string }) {
  const { issues } = useIssuesContext();

  const [state, setState] = React.useState<FormState>('loading');
  const [existed, setExisted] = React.useState(false);
  const [shipped, setShipped] = React.useState('');
  const [blocked, setBlocked] = React.useState('');
  const [next, setNext] = React.useState('');
  const [issueIds, setIssueIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    fetchReport(date, authorId)
      .then((report) => {
        if (cancelled) return;

        if (report) {
          setExisted(true);
          setShipped(report.shipped);
          setBlocked(report.blocked ?? '');
          setNext(report.next);
          setIssueIds(report.issues.map((issue) => issue.id));
        }

        setState('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not load that day');
        setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [date, authorId]);

  if (state === 'loading') {
    return <p className="text-muted-foreground text-sm">Loading that day…</p>;
  }

  if (state === 'failed') {
    return (
      <p role="alert" className="text-destructive text-sm">
        {error}
      </p>
    );
  }

  const canSubmit = shipped.trim().length > 0 && next.trim().length > 0 && !submitting;

  function toggleIssue(issueId: string) {
    setSaved(false);
    setIssueIds((current) =>
      current.includes(issueId)
        ? current.filter((candidate) => candidate !== issueId)
        : [...current, issueId],
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitReport(date, {
        shipped: shipped.trim(),
        // Empty means nothing is blocked, which the API stores as null.
        blocked: blocked.trim() || undefined,
        next: next.trim(),
        issueIds,
      });
      setExisted(true);
      setSaved(true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not submit the report');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {existed ? (
        <p className="text-muted-foreground border-l-2 pl-2 text-xs">
          You already filed a report for this day. Saving replaces it.
        </p>
      ) : null}

      <Field
        id="report-shipped"
        label="Shipped"
        hint="Required"
        value={shipped}
        onChange={(value) => {
          setSaved(false);
          setShipped(value);
        }}
        placeholder="What went out today"
      />

      <Field
        id="report-blocked"
        label="Blocked"
        hint="Leave empty if nothing is blocked"
        value={blocked}
        onChange={(value) => {
          setSaved(false);
          setBlocked(value);
        }}
        placeholder="What is in your way"
      />

      <Field
        id="report-next"
        label="Next"
        hint="Required"
        value={next}
        onChange={(value) => {
          setSaved(false);
          setNext(value);
        }}
        placeholder="What you pick up next"
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium">
          Linked issues <span className="text-muted-foreground">(optional)</span>
        </legend>

        {issues.length === 0 ? (
          <p className="text-muted-foreground text-xs">No issues to link.</p>
        ) : (
          <ul className="max-h-48 overflow-y-auto rounded-md border p-2">
            {issues.map((issue) => (
              <li key={issue.id}>
                <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={issueIds.includes(issue.id)}
                    onChange={() => toggleIssue(issue.id)}
                    className="accent-primary size-3.5"
                  />
                  <span className="truncate">{issue.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>
          {submitting ? 'Saving…' : existed ? 'Update report' : 'Submit report'}
        </Button>

        {saved ? (
          <span role="status" className="text-muted-foreground text-xs">
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label} <span className="text-muted-foreground font-normal">· {hint}</span>
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
      />
    </div>
  );
}
