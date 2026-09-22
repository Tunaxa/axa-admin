'use client';

import * as React from 'react';

import { useIssues, type UseIssues } from './use-issues';

interface IssuesContextValue extends UseIssues {
  /** The issue whose detail panel is open, if any. */
  openIssueId: string | null;
  setOpenIssueId: (issueId: string | null) => void;
}

const IssuesContext = React.createContext<IssuesContextValue | null>(null);

/**
 * Holds the work module's data and the open-issue selection.
 *
 * It sits above the app shell so the command palette — which lives in the top
 * bar, a different part of the tree from the board — can search the same
 * issues the board is showing instead of fetching a second copy that could
 * disagree with it.
 */
export function IssuesProvider({ children }: { children: React.ReactNode }) {
  const issues = useIssues();
  const [openIssueId, setOpenIssueId] = React.useState<string | null>(null);

  // Not memoised: `useIssues` returns a fresh object each render anyway, so a
  // `useMemo` here would look like an optimisation while never hitting.
  const value: IssuesContextValue = { ...issues, openIssueId, setOpenIssueId };

  return <IssuesContext value={value}>{children}</IssuesContext>;
}

export function useIssuesContext(): IssuesContextValue {
  const value = React.use(IssuesContext);

  if (!value) {
    throw new Error('useIssuesContext must be used inside IssuesProvider');
  }

  return value;
}
