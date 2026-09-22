import { BOARD_COLUMNS } from './board-columns';
import { IssueCard } from './issue-card';
import type { Issue } from './types';

/**
 * Kanban board: one column per workflow status.
 *
 * Read-only. Dragging cards between columns changes issue status, which needs
 * the API wired up and an ordering column in the schema — both separate work.
 */
export function IssueBoard({ issues }: { issues: Issue[] }) {
  return (
    <div className="flex h-full gap-4 overflow-x-auto p-4">
      {BOARD_COLUMNS.map((column) => {
        const columnIssues = issues.filter((issue) => issue.status === column.status);

        return (
          <section
            key={column.status}
            aria-labelledby={`column-${column.status}`}
            className="flex w-72 shrink-0 flex-col"
          >
            <header className="flex items-center gap-2 px-1 pb-2">
              <h2 id={`column-${column.status}`} className="text-sm font-medium">
                {column.label}
              </h2>
              <span className="bg-muted text-muted-foreground rounded px-1.5 text-xs tabular-nums">
                {columnIssues.length}
              </span>
            </header>

            <div className="flex flex-col gap-2">
              {columnIssues.length === 0 ? (
                <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
                  No issues
                </p>
              ) : (
                columnIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
