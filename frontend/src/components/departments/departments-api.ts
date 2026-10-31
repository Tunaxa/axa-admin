import type { Department } from '@/components/providers/access-provider';
import { apiFetch } from '@/lib/api';

export interface ManagerAccountInput {
  name: string;
  email: string;
  password: string;
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
  manager?: ManagerAccountInput;
}

export function createDepartment(input: CreateDepartmentInput): Promise<Department> {
  return apiFetch<Department>('/departments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateDepartment(
  id: string,
  input: { name?: string; description?: string },
): Promise<Department> {
  return apiFetch<Department>(`/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Names the manager: a brand-new account, or a person already in the department. */
export function setDepartmentManager(
  id: string,
  input: { userId?: string; account?: ManagerAccountInput },
): Promise<Department> {
  return apiFetch<Department>(`/departments/${id}/manager`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteDepartment(id: string): Promise<void> {
  return apiFetch<void>(`/departments/${id}`, { method: 'DELETE' });
}
