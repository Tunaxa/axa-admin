'use client';

import * as React from 'react';

import { BOARD_COLUMNS } from './board-columns';
import { IssueBoard } from './issue-board';
import { IssueList } from './issue-list';
import { useIssues } from './use-issues';
import { ViewToggle, type IssueView } from './view-toggle';

/**
 * Owns the issues and which view renders them.
 *
 * Both views read the same array, so switching does not refetch and a status
 * changed on the board is already correct in the list.
 */
export function IssueViews() {
  const [view, setView] = React.useState<IssueView>('board');
  const { issues, state, error, moveIssue } = useIssues();

  // The board has no column for every status, so on the board some issues are
  // counted but not drawn. Saying so is the point of offering the list.
  const offBoardCount = issues.filter(
    (issue) => !BOARD_COLUMNS.some((column) => column.status === issue.status),
  ).length;

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
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <ViewToggle view={view} onChange={setView} />
        <span className="text-muted-foreground text-xs">
          <span className="tabular-nums">{issues.length}</span>{' '}
          {issues.length === 1 ? 'issue' : 'issues'}
          {view === 'board' && offBoardCount > 0 ? (
            <> · {offBoardCount} not shown on the board</>
          ) : null}
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-destructive border-b px-4 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1">
        {view === 'board' ? (
          <IssueBoard issues={issues} onMoveIssue={(id, status) => void moveIssue(id, status)} />
        ) : (
          <IssueList issues={issues} />
        )}
      </div>
    </div>
  );
}
