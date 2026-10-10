'use client';

import * as React from 'react';
import Markdown from 'react-markdown';

import { blocksToMarkdown } from './blocks-to-markdown';
import { fetchPage } from './docs-api';
import type { Page } from './types';

/**
 * Markdown element styles.
 *
 * Passed to the renderer rather than applied with a typography plugin, so the
 * only elements that can appear on the page are the ones listed here.
 */
const COMPONENTS = {
  h1: (props: object) => (
    <h1 className="mt-6 mb-3 text-2xl font-semibold tracking-tight first:mt-0" {...props} />
  ),
  h2: (props: object) => (
    <h2 className="mt-6 mb-2 text-xl font-semibold tracking-tight first:mt-0" {...props} />
  ),
  h3: (props: object) => (
    <h3 className="mt-5 mb-2 text-base font-semibold tracking-tight first:mt-0" {...props} />
  ),
  p: (props: object) => <p className="my-3 text-sm leading-6" {...props} />,
  ul: (props: object) => <ul className="my-3 list-disc pl-5 text-sm leading-6" {...props} />,
  ol: (props: object) => <ol className="my-3 list-decimal pl-5 text-sm leading-6" {...props} />,
  li: (props: object) => <li className="my-1" {...props} />,
  blockquote: (props: object) => (
    <blockquote className="text-muted-foreground my-3 border-l-2 pl-3 text-sm" {...props} />
  ),
  hr: (props: object) => <hr className="my-6" {...props} />,
  pre: (props: object) => (
    <pre className="bg-muted my-3 overflow-x-auto rounded-md p-3 text-xs" {...props} />
  ),
  code: (props: object) => <code className="font-mono" {...props} />,
  a: (props: object) => (
    // External by assumption: docs link out, and a link that quietly replaced
    // the admin app would lose whatever the reader was in the middle of.
    <a
      className="underline underline-offset-2"
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  // eslint-disable-next-line @next/next/no-img-element
  img: (props: object) => <img className="my-3 max-w-full rounded-md" alt="" {...props} />,
  table: (props: object) => <table className="my-3 w-full text-sm" {...props} />,
};

type ContentState = 'loading' | 'ready' | 'failed';

export function PageContent({ pageId }: { pageId: string }) {
  const [state, setState] = React.useState<ContentState>('loading');
  const [page, setPage] = React.useState<Page | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetchPage(pageId)
      .then((loaded) => {
        if (cancelled) return;
        setPage(loaded);
        setState('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Could not load that page');
        setState('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [pageId]);

  if (state === 'loading') {
    return <p className="text-muted-foreground p-6 text-sm">Loading the page…</p>;
  }

  if (state === 'failed' || !page) {
    return (
      <p role="alert" className="text-destructive p-6 text-sm">
        {error}
      </p>
    );
  }

  const markdown = blocksToMarkdown(page.blocks);

  return (
    <article className="mx-auto w-full max-w-3xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
        <p className="text-muted-foreground mt-1 text-xs">
          /{page.slug} · {page.blocks.length} block{page.blocks.length === 1 ? '' : 's'}
        </p>
      </header>

      {markdown.length === 0 ? (
        <p className="text-muted-foreground text-sm">This page has no content yet.</p>
      ) : (
        // Raw HTML in the source is not rendered: the renderer escapes it
        // unless `rehype-raw` is added, which it deliberately is not.
        <Markdown components={COMPONENTS}>{markdown}</Markdown>
      )}
    </article>
  );
}
