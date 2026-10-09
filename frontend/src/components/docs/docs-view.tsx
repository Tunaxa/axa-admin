'use client';

import * as React from 'react';

import { fetchPages } from './docs-api';
import { PageContent } from './page-content';
import { buildTree, PageTreeNav } from './page-tree';
import type { PageSummary } from './types';

type ViewState = 'loading' | 'ready' | 'failed';

/**
 * The docs reader: the page tree on the left, the selected page on the right.
 *
 * The tree comes from one request — `GET /docs/pages` returns the whole tenant
 * without page content — and the content pane fetches a page only when it is
 * opened. That split is the reason the API has two shapes.
 */
export function DocsView() {
  const [state, setState] = React.useState<ViewState>('loading');
  const [pages, setPages] = React.useState<PageSummary[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [picked, setPicked] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetchPages()
      .then((loaded) => {
        if (cancelled) return;
        setPages(loaded);
        setState('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not load the page tree');
        setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const tree = React.useMemo(() => buildTree(pages), [pages]);

  // Derived rather than stored, so no effect has to seed the selection once
  // the tree arrives.
  const firstRoot = tree.get('')?.[0]?.id ?? null;
  const selectedId = picked ?? firstRoot;

  if (state === 'loading') {
    return <p className="text-muted-foreground p-6 text-sm">Loading the docs…</p>;
  }

  if (state === 'failed') {
    return (
      <p role="alert" className="text-destructive p-6 text-sm">
        {error}
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <nav
        aria-label="Documentation"
        className="shrink-0 overflow-y-auto border-b p-3 md:w-64 md:border-r md:border-b-0"
      >
        <h2 className="text-muted-foreground mb-2 px-1 text-xs font-medium">Pages</h2>
        <PageTreeNav tree={tree} selectedId={selectedId} onSelect={setPicked} />
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {selectedId ? (
          // Keyed so opening another page remounts on a clean loading state
          // rather than showing the previous page's body under a new title.
          <PageContent key={selectedId} pageId={selectedId} />
        ) : (
          <p className="text-muted-foreground p-6 text-sm">Select a page to read it.</p>
        )}
      </div>
    </div>
  );
}
