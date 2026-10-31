import { apiFetch } from '@/lib/api';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  workspaceId: string;
  departmentId: string | null;
  completionPercent: number;
}

export async function fetchProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects');
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  /** The CEO has to pick one; a manager's own department is implied. */
  departmentId?: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  completionPercent?: number;
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/projects/${id}`, { method: 'DELETE' });
}
