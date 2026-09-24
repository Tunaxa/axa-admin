import { apiFetch } from '@/lib/api';

import type {
  ActivityEvent,
  Issue,
  IssuePriority,
  IssueStatus,
  Project,
  TeamMember,
  Workspace,
} from './types';

interface IssueResponse {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  app: Issue['app'];
  assigneeId: string | null;
}

function toIssue(response: IssueResponse): Issue {
  return {
    id: response.id,
    title: response.title,
    description: response.description,
    status: response.status,
    priority: response.priority,
    app: response.app,
    assigneeId: response.assigneeId,
  };
}

export async function fetchIssues(): Promise<Issue[]> {
  const issues = await apiFetch<IssueResponse[]>('/issues');

  return issues.map(toIssue);
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  return apiFetch<TeamMember[]>('/users');
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  return apiFetch<Workspace[]>('/workspaces');
}

export async function fetchProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects');
}

export async function fetchProjectActivity(projectId: string): Promise<ActivityEvent[]> {
  return apiFetch<ActivityEvent[]>(`/projects/${projectId}/activity`);
}

/** Fields the quick-create modal sends. Status and priority fall back to the schema defaults. */
export interface CreateIssueInput {
  workspaceId: string;
  title: string;
  description?: string;
}

export async function createIssue(input: CreateIssueInput): Promise<Issue> {
  const issue = await apiFetch<IssueResponse>('/issues', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return toIssue(issue);
}

/** Fields the detail panel can change. */
export interface IssuePatch {
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeId?: string | null;
}

export async function updateIssue(id: string, patch: IssuePatch): Promise<Issue> {
  const issue = await apiFetch<IssueResponse>(`/issues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

  return toIssue(issue);
}
