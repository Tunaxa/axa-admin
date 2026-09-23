/** Daily report shapes, mirroring the `/daily-reports` responses. */

export interface DailyReport {
  id: string;
  /** ISO timestamp at UTC midnight; only the date part is meaningful. */
  reportDate: string;
  shipped: string;
  blocked: string | null;
  next: string;
  author: { id: string; name: string; email: string };
  issues: { id: string; title: string }[];
}

export interface SubmitDailyReport {
  shipped: string;
  blocked?: string;
  next: string;
  issueIds?: string[];
}
