import { apiFetch } from '@/lib/api';

import type { CreatePageInput, Page, PageSummary, UpdatePageInput } from './types';

/** The whole tenant's tree, without page content. */
export async function fetchPages(): Promise<PageSummary[]> {
  return apiFetch<PageSummary[]>('/docs/pages');
}

/** One page, with its blocks. */
export async function fetchPage(id: string): Promise<Page> {
  return apiFetch<Page>(`/docs/pages/${encodeURIComponent(id)}`);
}

/** Create a new page. */
export async function createPage(input: CreatePageInput): Promise<Page> {
  return apiFetch<Page>('/docs/pages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Update an existing page. */
export async function updatePage(id: string, input: UpdatePageInput): Promise<Page> {
  return apiFetch<Page>(`/docs/pages/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Delete a page and its descendants. */
export async function deletePage(id: string): Promise<{ deleted: number }> {
  return apiFetch<{ deleted: number }>(`/docs/pages/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
