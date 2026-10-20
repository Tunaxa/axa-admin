import { apiFetch } from '@/lib/api';

import type { OrgChartData, OrgChartDocument } from './types';

/**
 * Fetches the tenant's single organization chart.
 * Created on the fly on the backend if missing.
 */
export async function fetchOrgChart(): Promise<OrgChartDocument> {
  return apiFetch<OrgChartDocument>('/orgchart');
}

/**
 * Persists the entire organigramme data (nodes and edges).
 */
export async function saveOrgChart(data: OrgChartData, name?: string): Promise<OrgChartDocument> {
  return apiFetch<OrgChartDocument>('/orgchart', {
    method: 'PUT',
    body: JSON.stringify({ data, name }),
  });
}

/**
 * Resets / deletes the tenant's organization chart.
 */
export async function deleteOrgChart(): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>('/orgchart', {
    method: 'DELETE',
  });
}
