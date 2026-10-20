'use client';

import * as React from 'react';
import Markdown from 'react-markdown';

import { blocksToMarkdown } from './blocks-to-markdown';
import type { Page } from './types';

/**
 * Markdown element styles.
 *
 * Passed to the renderer rather than applied with a typography plugin, so the
 * only elements that can appear on the page are the ones listed here.
 */
const COMPONENTS = {
  h1: (props: object) => (
    <h1 className="mt-6 mb-3 text-2xl font-bold tracking-tight first:mt-0" {...props} />
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
  li: ({ children, ...props }: React.ComponentProps<'li'>) => {
    // If it's a task list item [ ] or [x]
    if (
      typeof children === 'string' ||
      (Array.isArray(children) && typeof children[0] === 'string')
    ) {
      const text = typeof children === 'string' ? children : (children[0] as string);
      if (text.startsWith('[ ] ') || text.startsWith('[x] ')) {
        const checked = text.startsWith('[x] ');
        const remainder = text.slice(4);
        const rest = Array.isArray(children) ? [remainder, ...children.slice(1)] : remainder;
        return (
          <li className="my-1.5 flex items-start gap-2 list-none -ml-5" {...props}>
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="mt-1 h-3.5 w-3.5 rounded border-muted-foreground/50 text-primary pointer-events-none"
            />
            <span className={checked ? 'line-through text-muted-foreground' : ''}>{rest}</span>
          </li>
        );
      }
    }
    return (
      <li className="my-1" {...props}>
        {children}
      </li>
    );
  },
  blockquote: (props: object) => (
    <blockquote
      className="text-muted-foreground my-3 border-l-2 border-primary/50 pl-3 text-sm italic"
      {...props}
    />
  ),
  hr: (props: object) => <hr className="my-6 border-border" {...props} />,
  pre: (props: object) => (
    <pre className="bg-muted my-3 overflow-x-auto rounded-md p-3 text-xs font-mono" {...props} />
  ),
  code: (props: object) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs" {...props} />
  ),
  a: (props: object) => (
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

export function PageContent({ page }: { page: Page }) {
  const markdown = blocksToMarkdown(page.blocks);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
      <header className="mb-6 border-b border-border/50 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
        <p className="text-muted-foreground mt-1.5 text-xs">
          /{page.slug} · {page.blocks.length} bloc{page.blocks.length === 1 ? '' : 's'}
        </p>
      </header>

      {markdown.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Cette page n&apos;a pas encore de contenu.
          </p>
          <p className="text-muted-foreground/70 mt-1 text-xs">
            Basculez en mode édition (⌘E) pour commencer à rédiger.
          </p>
        </div>
      ) : (
        <Markdown components={COMPONENTS}>{markdown}</Markdown>
      )}
    </article>
  );
}
