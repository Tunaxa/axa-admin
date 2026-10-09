import { GithubLinkKind } from '@prisma/client';

/**
 * The slice of a GitHub delivery this service reads.
 *
 * Deliberately not the whole payload: GitHub sends a great deal, most of it
 * irrelevant, and typing only what is used makes it obvious what a change to
 * their schema could break.
 */
export interface GithubDelivery {
  action?: string;
  repository?: { full_name?: string };
  pull_request?: GithubPullRequest;
  issue?: GithubIssue;
}

interface GithubPullRequest {
  number?: number;
  title?: string;
  body?: string | null;
  html_url?: string;
  state?: string;
  merged?: boolean;
  merged_at?: string | null;
  head?: { ref?: string };
}

interface GithubIssue {
  number?: number;
  title?: string;
  body?: string | null;
  html_url?: string;
  state?: string;
  /** Present when the payload is really a pull request wearing an issue's shape. */
  pull_request?: unknown;
}

/** What the receiver needs, once the shape has been checked. */
export interface GithubObject {
  kind: GithubLinkKind;
  number: number;
  title: string;
  url: string;
  state: string;
  branch: string | null;
  mergedAt: Date | null;
  /** Branch name, title and body — everything that might name an issue. */
  searchable: string;
}

/**
 * Reads a delivery, or says why it cannot be used.
 *
 * Returns null rather than throwing for anything unusable. A malformed or
 * unsupported delivery is not an error GitHub can act on, and answering it
 * with a failure only buys a retry of the same thing.
 */
export function readDelivery(
  event: string,
  payload: GithubDelivery,
): GithubObject | null {
  if (event === 'pull_request') {
    return readPullRequest(payload.pull_request);
  }

  if (event === 'issues') {
    return readIssue(payload.issue);
  }

  return null;
}

function readPullRequest(
  pr: GithubPullRequest | undefined,
): GithubObject | null {
  if (!pr?.number || !pr.title || !pr.html_url) {
    return null;
  }

  const branch = pr.head?.ref ?? null;

  return {
    kind: GithubLinkKind.pull_request,
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    // GitHub reports a merged pull request as `closed` with a separate flag.
    // Collapsing the two would lose the only distinction anybody cares about.
    state: pr.merged ? 'merged' : (pr.state ?? 'open'),
    branch,
    mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
    searchable: [branch, pr.title, pr.body].filter(Boolean).join('\n'),
  };
}

function readIssue(issue: GithubIssue | undefined): GithubObject | null {
  if (!issue?.number || !issue.title || !issue.html_url) {
    return null;
  }

  // GitHub sends pull requests through the `issues` event too, with this key
  // present. Taking them would create a second, worse link for the same
  // object — the pull_request event carries the branch, this one does not.
  if (issue.pull_request) {
    return null;
  }

  return {
    kind: GithubLinkKind.issue,
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    state: issue.state ?? 'open',
    branch: null,
    mergedAt: null,
    searchable: [issue.title, issue.body].filter(Boolean).join('\n'),
  };
}
