'use client';

import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  APP_LABELS,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  STATUS_LABELS,
  assigneeNameFor,
} from './labels';
import type { Issue, TeamMember } from './types';

/**
 * Table alternative to the board.
 *
 * Shows every issue in one scrollable list, including statuses the board has no
 * column for, which is the reason to have this view at all.
 */
export function IssueList({
  issues,
  members,
  onOpenIssue,
}: {
  issues: Issue[];
  members: TeamMember[];
  onOpenIssue: (issueId: string) => void;
}) {
  if (issues.length === 0) {
    return <p className="text-muted-foreground p-4 text-sm">No issues</p>;
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-32">Priority</TableHead>
            <TableHead className="w-32">App</TableHead>
            <TableHead className="w-36">Assignee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue) => (
            <TableRow
              key={issue.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenIssue(issue.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpenIssue(issue.id);
                }
              }}
              className="focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
            >
              <TableCell className="font-medium">{issue.title}</TableCell>
              <TableCell className="text-muted-foreground">{STATUS_LABELS[issue.status]}</TableCell>
              <TableCell className={cn(PRIORITY_STYLES[issue.priority])}>
                {PRIORITY_LABELS[issue.priority]}
              </TableCell>
              <TableCell>
                {issue.app ? (
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {APP_LABELS[issue.app]}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {assigneeNameFor(issue.assigneeId, members) ?? 'Unassigned'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
