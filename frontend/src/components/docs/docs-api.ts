import { apiFetch } from '@/lib/api';

import type { Page, PageSummary } from './types';

/** The whole tenant's tree, without page content. */
export async function fetchPages(): Promise<PageSummary[]> {
  return apiFetch<PageSummary[]>('/docs/pages');
}

/** One page, with its blocks. */
export async function fetchPage(id: string): Promise<Page> {
  return apiFetch<Page>(`/docs/pages/${encodeURIComponent(id)}`);
}
