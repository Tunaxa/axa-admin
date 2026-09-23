import { apiFetch } from '@/lib/api';

import type { DailyReport, SubmitDailyReport } from './types';

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
