'use client';

import { cn } from 'cn';
import * as React from 'react';

import { BOARD_COLUMNS, type BoardColumn } from './board-columns';
import { IssueCard } from './issue-card';
import { assigneeNameFor } from './labels';
import type { Issue, IssueStatus, TeamMember } from './types';

/**
 * Kanban board with drag and drop between columns.
 *
 * Presentational: the issues and the status change come from the caller, so the
 * board and the list render the same data without fetching twice.
 */
export function IssueBoard({
  issues,
  members,
  onMoveIssue,
  onOpenIssue,
}: {
  issues: Issue[];
  members: TeamMember[];
  onMoveIssue: (issueId: string, status: IssueStatus) => void;
  onOpenIssue: (issueId: string) => void;
}) {
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<BoardColumn['status'] | null>(null);

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-4">
      {BOARD_COLUMNS.map((column) => {
        const columnIssues = issues.filter((issue) => issue.status === column.status);

        return (
          <section
            key={column.status}
            aria-labelledby={`column-${column.status}`}
            onDragOver={(event) => {
              // Without preventDefault the drop is rejected by the browser.
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropTarget(column.status);
            }}
            onDragLeave={() =>
              setDropTarget((current) => (current === column.status ? null : current))
            }
            onDrop={(event) => {
              event.preventDefault();
              const issueId = event.dataTransfer.getData('text/plain') || draggingId;
              setDropTarget(null);
              setDraggingId(null);

              if (issueId) {
                onMoveIssue(issueId, column.status);
              }
            }}
            className={cn(
              'flex w-72 shrink-0 flex-col rounded-md transition-colors',
              dropTarget === column.status && 'bg-muted/50 ring-ring ring-2',
            )}
          >
            <header className="flex items-center gap-2 px-1 pb-2">
              <h2 id={`column-${column.status}`} className="text-sm font-medium">
                {column.label}
              </h2>
              <span className="bg-muted text-muted-foreground rounded px-1.5 text-xs tabular-nums">
                {columnIssues.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-2">
              {columnIssues.length === 0 ? (
                <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
                  No issues
                </p>
              ) : (
                columnIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    assigneeName={assigneeNameFor(issue.assigneeId, members)}
                    isDragging={draggingId === issue.id}
                    onOpen={() => onOpenIssue(issue.id)}
                    onDragStart={() => setDraggingId(issue.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
