'use client';

import { cn } from 'cn';
import * as React from 'react';

import { BOARD_COLUMNS, type BoardColumn } from './board-columns';
import { IssueCard } from './issue-card';
import { fetchIssues, updateIssueStatus } from './issues-api';
import type { Issue } from './types';

type LoadState = 'loading' | 'ready' | 'failed';

/**
 * Kanban board with drag and drop between columns.
 *
 * Dropping a card writes the new status through `PATCH /issues/:id`. The move
 * is applied optimistically and rolled back if the request fails, so a dropped
 * card never sits in a column the server did not accept.
 */
export function IssueBoard() {
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [state, setState] = React.useState<LoadState>('loading');
  const [error, setError] = React.useState<string | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<BoardColumn['status'] | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetchIssues()
      .then((loaded) => {
        if (cancelled) return;
        setIssues(loaded);
        setState('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not load issues');
        setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function moveIssue(issueId: string, status: BoardColumn['status']) {
    const issue = issues.find((candidate) => candidate.id === issueId);

    if (!issue || issue.status === status) {
      return;
    }

    const previousStatus = issue.status;

    setError(null);
    setIssues((current) =>
      current.map((candidate) => (candidate.id === issueId ? { ...candidate, status } : candidate)),
    );

    try {
      await updateIssueStatus(issueId, status);
    } catch (cause: unknown) {
      // Put the card back where it came from; the server is the source of truth.
      setIssues((current) =>
        current.map((candidate) =>
          candidate.id === issueId ? { ...candidate, status: previousStatus } : candidate,
        ),
      );
      setError(cause instanceof Error ? cause.message : 'Could not move the issue');
    }
  }

  if (state === 'loading') {
    return <p className="text-muted-foreground p-4 text-sm">Loading issues…</p>;
  }

  if (state === 'failed') {
    return (
      <div className="p-4">
        <p className="text-destructive text-sm">{error}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          The board reads the API at <code className="font-mono">NEXT_PUBLIC_API_URL</code> and
          needs a signed-in session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {error ? (
        <p role="alert" className="text-destructive border-b px-4 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
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
                  void moveIssue(issueId, column.status);
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
                      isDragging={draggingId === issue.id}
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
    </div>
  );
}
