import { apiFetch } from '@/lib/api';

import type { ClosedIssue, DailyReport, SubmitDailyReport } from './types';

/** The claims of the presented token. Used to find the caller's own report. */
interface TokenClaims {
  sub: string;
  org: string;
  email: string;
}

export async function fetchMe(): Promise<TokenClaims> {
  return apiFetch<TokenClaims>('/auth/me');
}

export async function fetchReport(date: string, authorId: string): Promise<DailyReport | null> {
  const reports = await apiFetch<DailyReport[]>(
    `/daily-reports?date=${encodeURIComponent(date)}&authorId=${encodeURIComponent(authorId)}`,
  );

  return reports[0] ?? null;
}

export async function submitReport(date: string, report: SubmitDailyReport): Promise<DailyReport> {
  return apiFetch<DailyReport>(`/daily-reports/${date}`, {
    method: 'PUT',
    body: JSON.stringify(report),
  });
}

/** Today as `YYYY-MM-DD` in the viewer's own timezone, which is the day they worked. */
export function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 10);
}

/** Every report one developer filed, newest day first — the API's own order. */
export async function fetchReportsByAuthor(authorId: string): Promise<DailyReport[]> {
  return apiFetch<DailyReport[]>(`/daily-reports?authorId=${encodeURIComponent(authorId)}`);
}

/** The issues one person closed during a calendar day, in their own timezone. */
export async function fetchIssuesClosedOn(
  date: string,
  assigneeId: string,
): Promise<ClosedIssue[]> {
  const { start, end } = localDayBounds(date);

  const params = new URLSearchParams({
    assigneeId,
    closedAfter: start,
    closedBefore: end,
  });

  return apiFetch<ClosedIssue[]>(`/issues?${params.toString()}`);
}

/**
 * The instants a calendar day starts and ends at, here.
 *
 * `closedAt` is a timestamp, so "that day" only means something in a timezone.
 * The client knows its own, so it sends the boundaries rather than making the
 * server guess. `setDate` rather than adding 24 hours, so a day that gains or
 * loses an hour to daylight saving still ends where it should.
 */
function localDayBounds(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start: start.toISOString(), end: end.toISOString() };
}
