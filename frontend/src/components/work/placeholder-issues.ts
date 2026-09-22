import type { Issue } from './types';

/**
 * Placeholder board content.
 *
 * The board is not wired to `GET /issues` yet: that needs an API client and a
 * way to hold the access token in the frontend, neither of which exists. These
 * rows exist only so the columns, cards and empty state can be seen and
 * reviewed, and they are deleted by the task that connects the API.
 */
export const PLACEHOLDER_ISSUES: Issue[] = [
  {
    id: '1',
    title: 'Define provisioning webhook contract',
    status: 'backlog',
    priority: 'medium',
    app: 'axapass',
    assigneeName: null,
  },
  {
    id: '2',
    title: 'Add rate limiting to the auth endpoints',
    status: 'backlog',
    priority: 'high',
    app: 'axa_admin',
    assigneeName: 'Rochdi',
  },
  {
    id: '3',
    title: 'Wire the board to GET /issues',
    status: 'todo',
    priority: 'high',
    app: 'axa_admin',
    assigneeName: 'Rochdi',
  },
  {
    id: '4',
    title: 'Seed a bootstrap organization',
    status: 'todo',
    priority: 'low',
    app: null,
    assigneeName: null,
  },
  {
    id: '5',
    title: 'Add a test database to CI',
    status: 'in_progress',
    priority: 'urgent',
    app: 'axa_admin',
    assigneeName: 'Rochdi',
  },
  {
    id: '6',
    title: 'Document the Prisma 7 configuration split',
    status: 'in_review',
    priority: 'none',
    app: null,
    assigneeName: 'Rochdi',
  },
  {
    id: '7',
    title: 'Set up lint, type-check and test on PR',
    status: 'done',
    priority: 'medium',
    app: 'axa_admin',
    assigneeName: 'Rochdi',
  },
];
