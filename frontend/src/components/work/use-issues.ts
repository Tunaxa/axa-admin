'use client';

import * as React from 'react';

import { fetchIssues, fetchTeamMembers, updateIssue, type IssuePatch } from './issues-api';
import type { Issue, IssueStatus, TeamMember } from './types';

export type LoadState = 'loading' | 'ready' | 'failed';

export interface UseIssues {
  issues: Issue[];
  members: TeamMember[];
  state: LoadState;
  error: string | null;
  moveIssue: (issueId: string, status: IssueStatus) => Promise<void>;
  patchIssue: (issueId: string, patch: IssuePatch) => Promise<void>;
}

/**
 * Loads the issues and the roster once, and applies changes to both.
 *
 * Shared by the board, the list and the detail panel so all three render the
 * same rows from the same request.
 */
export function useIssues(): UseIssues {
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [state, setState] = React.useState<LoadState>('loading');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([fetchIssues(), fetchTeamMembers()])
      .then(([loadedIssues, loadedMembers]) => {
        if (cancelled) return;
        setIssues(loadedIssues);
        setMembers(loadedMembers);
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

  /**
   * Applies a change optimistically and rolls the whole issue back if the
   * request is refused, so the board never shows a state the server rejected.
   */
  const patchIssue = React.useCallback(
    async (issueId: string, patch: IssuePatch) => {
      // Read the issue from state directly. Capturing it inside a `setIssues`
      // updater does not work: the updater runs during render, not here.
      const previous = issues.find((candidate) => candidate.id === issueId);

      if (!previous) {
        return;
      }

      const unchanged = (Object.keys(patch) as (keyof IssuePatch)[]).every(
        (key) => patch[key] === previous[key],
      );

      if (unchanged) {
        return;
      }

      setError(null);
      setIssues((current) =>
        current.map((candidate) =>
          candidate.id === issueId ? { ...candidate, ...patch } : candidate,
        ),
      );

      try {
        await updateIssue(issueId, patch);
      } catch (cause: unknown) {
        setIssues((current) =>
          current.map((candidate) => (candidate.id === issueId ? previous : candidate)),
        );
        setError(cause instanceof Error ? cause.message : 'Could not update the issue');
      }
    },
    [issues],
  );

  const moveIssue = React.useCallback(
    (issueId: string, status: IssueStatus) => patchIssue(issueId, { status }),
    [patchIssue],
  );

  return { issues, members, state, error, moveIssue, patchIssue };
}
