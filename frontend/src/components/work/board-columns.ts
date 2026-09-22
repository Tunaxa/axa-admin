import type { IssueStatus } from './types';

/**
 * The board's columns, in workflow order.
 *
 * `cancelled` is a valid issue status but has no column: cancelled work does
 * not belong on a board that shows what is in flight. It needs a filtered list
 * view instead, which is separate work.
 */
export interface BoardColumn {
  status: Extract<IssueStatus, 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'>;
  label: string;
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'todo', label: 'Todo' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'in_review', label: 'In Review' },
  { status: 'done', label: 'Done' },
];
