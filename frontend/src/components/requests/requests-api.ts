import { apiFetch } from '@/lib/api';

export type AccountRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_more_info'
  | 'withdrawn';

export type AppKey = 'axa_admin' | 'axacrm' | 'axapass' | 'website';

export interface AccountRequest {
  id: string;
  organizationId: string;
  app: AppKey;
  requesterEmail: string;
  requesterName: string;
  note: string | null;
  raisedById: string | null;
  status: AccountRequestStatus;
  decidedById: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  checkoutSessionId: string | null;
  checkoutUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestInput {
  app: AppKey;
  requesterEmail: string;
  requesterName: string;
  note?: string;
}

export async function fetchRequests(filters: {
  status?: AccountRequestStatus;
  app?: AppKey;
} = {}): Promise<AccountRequest[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.app) params.set('app', filters.app);
  const qs = params.toString();
  return apiFetch<AccountRequest[]>(`/requests${qs ? `?${qs}` : ''}`);
}

export async function createRequest(input: CreateRequestInput): Promise<AccountRequest> {
  return apiFetch<AccountRequest>('/requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function approveRequest(
  id: string,
  input: { priceId: string; note?: string; mode?: 'subscription' | 'payment' },
): Promise<AccountRequest> {
  return apiFetch<AccountRequest>(`/requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function rejectRequest(id: string, note: string): Promise<AccountRequest> {
  return apiFetch<AccountRequest>(`/requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function needsMoreInfo(id: string, note: string): Promise<AccountRequest> {
  return apiFetch<AccountRequest>(`/requests/${id}/needs-more-info`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}
