'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';

import type { PageSummary } from './types';

/** Children of each page, keyed by parent id; the root is keyed by `''`. */
export type PageTree = Map<string, PageSummary[]>;

/**
 * Groups a flat page list into parent → children.
 *
 * The API already sorts the list, so the groups come out in render order
 * without sorting again here.
 */
export function buildTree(pages: PageSummary[]): PageTree {
  const tree: PageTree = new Map();

  for (const page of pages) {
    const key = page.parentId ?? '';
    const siblings = tree.get(key);

    if (siblings) {
      siblings.push(page);
    } else {
      tree.set(key, [page]);
    }
  }

  return tree;
}

export function PageTreeNav({
  tree,
  selectedId,
  onSelect,
}: {
  tree: PageTree;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const roots = tree.get('') ?? [];

  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  function toggle(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  if (roots.length === 0) {
    return <p className="text-muted-foreground p-2 text-sm">No pages yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {roots.map((page) => (
        <TreeNode
          key={page.id}
          page={page}
          tree={tree}
          depth={0}
          selectedId={selectedId}
          collapsed={collapsed}
          onToggle={toggle}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

function TreeNode({
  page,
  tree,
  depth,
  selectedId,
  collapsed,
  onToggle,
  onSelect,
}: {
  page: PageSummary;
  tree: PageTree;
  depth: number;
  selectedId: string | null;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const children = tree.get(page.id) ?? [];
  const hasChildren = children.length > 0;
  // Open unless explicitly collapsed: a documentation tree is there to be read,
  // and a sidebar that starts shut hides what the reader came for.
  const open = hasChildren && !collapsed.has(page.id);
  const isSelected = page.id === selectedId;

  return (
    <li>
      <div
        className={cn(
          'hover:bg-muted flex items-center gap-1 rounded-md',
          isSelected && 'bg-muted',
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(page.id)}
            aria-label={open ? `Collapse ${page.title}` : `Expand ${page.title}`}
            aria-expanded={open}
            className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1"
          >
            <ChevronRight
              className={cn('size-3.5 transition-transform', open && 'rotate-90')}
              aria-hidden
            />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          onClick={() => onSelect(page.id)}
          aria-current={isSelected ? 'page' : undefined}
          className={cn(
            'min-w-0 flex-1 truncate py-1.5 pr-2 text-left text-sm',
            isSelected && 'font-medium',
          )}
        >
          {page.title}
        </button>
      </div>

      {open ? (
        <ul className="flex flex-col gap-0.5">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              page={child}
              tree={tree}
              depth={depth + 1}
              selectedId={selectedId}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
