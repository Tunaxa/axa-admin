import { apiFetch } from '@/lib/api';

export interface Project {
  id: string;
  name: string;
  status: string;
  workspaceId: string;
  completionPercent: number;
}

export async function fetchProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects');
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
