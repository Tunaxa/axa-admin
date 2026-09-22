import { apiFetch } from '@/lib/api';

import type { Issue, IssueStatus } from './types';

/**
 * The API returns more fields than the board needs; this is the subset the
 * board reads, plus the assignee id it maps to a display name later.
 */
interface IssueResponse {
  id: string;
  title: string;
  status: IssueStatus;
  priority: Issue['priority'];
  app: Issue['app'];
  assigneeId: string | null;
}

function toIssue(response: IssueResponse): Issue {
  return {
    id: response.id,
    title: response.title,
    status: response.status,
    priority: response.priority,
    app: response.app,
    // The list endpoint returns the assignee id, not the name. Resolving names
    // needs either an expanded response or a users endpoint; until then the
    // card shows the issue as unassigned rather than printing a raw uuid.
    assigneeName: null,
  };
}

export async function fetchIssues(): Promise<Issue[]> {
  const issues = await apiFetch<IssueResponse[]>('/issues');

  return issues.map(toIssue);
}

export async function updateIssueStatus(id: string, status: IssueStatus): Promise<Issue> {
  const issue = await apiFetch<IssueResponse>(`/issues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  return toIssue(issue);
}
