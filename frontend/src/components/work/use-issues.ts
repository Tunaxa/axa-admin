'use client';

import * as React from 'react';

import { fetchIssues, updateIssueStatus } from './issues-api';
import type { Issue, IssueStatus } from './types';

export type LoadState = 'loading' | 'ready' | 'failed';

export interface UseIssues {
  issues: Issue[];
  state: LoadState;
  error: string | null;
  moveIssue: (issueId: string, status: IssueStatus) => Promise<void>;
}

/**
 * Loads the issues once and exposes a status change.
 *
 * Shared by the board and the list so both render the same rows from the same
 * request; switching views does not refetch.
 */
export function useIssues(): UseIssues {
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [state, setState] = React.useState<LoadState>('loading');
  const [error, setError] = React.useState<string | null>(null);

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

  const moveIssue = React.useCallback(
    async (issueId: string, status: IssueStatus) => {
      // Read the previous status from state directly. Capturing it inside a
      // `setIssues` updater does not work: the updater runs during render, not
      // synchronously here, so the value would still be undefined below.
      const issue = issues.find((candidate) => candidate.id === issueId);

      if (!issue || issue.status === status) {
        return;
      }

      const previousStatus = issue.status;

      setError(null);
      setIssues((current) =>
        current.map((candidate) =>
          candidate.id === issueId ? { ...candidate, status } : candidate,
        ),
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
    },
    [issues],
  );

  return { issues, state, error, moveIssue };
}
