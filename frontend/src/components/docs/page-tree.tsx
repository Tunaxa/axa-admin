'use client';

import * as React from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import { cn } from 'cn';

import { FOCUS_RING } from '@/lib/focus';
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

/** Pre-order traversal of all currently expanded (visible) pages in the tree. */
export function getVisiblePages(tree: PageTree, collapsed: Set<string>): PageSummary[] {
  const visible: PageSummary[] = [];

  function traverse(parentId: string) {
    const children = tree.get(parentId) ?? [];
    for (const page of children) {
      visible.push(page);
      if (!collapsed.has(page.id)) {
        traverse(page.id);
      }
    }
  }

  traverse('');
  return visible;
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
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const itemRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  const visiblePages = React.useMemo(() => getVisiblePages(tree, collapsed), [tree, collapsed]);

  // Active roving tabindex target: either the explicitly focused node,
  // or the currently selected page, or the first visible page.
  const effectiveFocusedId = React.useMemo(() => {
    if (focusedId && visiblePages.some((p) => p.id === focusedId)) {
      return focusedId;
    }
    if (selectedId && visiblePages.some((p) => p.id === selectedId)) {
      return selectedId;
    }
    return visiblePages[0]?.id ?? null;
  }, [focusedId, selectedId, visiblePages]);

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

  function focusNode(id: string) {
    setFocusedId(id);
    const element = itemRefs.current.get(id);
    if (element) {
      element.focus();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (visiblePages.length === 0) return;

    const firstPage = visiblePages[0];
    const currentId = effectiveFocusedId ?? firstPage?.id;
    if (!currentId) return;

    const currentIndex = visiblePages.findIndex((p) => p.id === currentId);
    const currentPage = currentIndex >= 0 ? visiblePages[currentIndex] : undefined;
    if (!currentPage) return;

    const children = tree.get(currentPage.id) ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = hasChildren && !collapsed.has(currentPage.id);

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, visiblePages.length - 1);
        const next = visiblePages[nextIndex];
        if (next) {
          focusNode(next.id);
          onSelect(next.id);
        }
        break;
      }

      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        const prev = visiblePages[prevIndex];
        if (prev) {
          focusNode(prev.id);
          onSelect(prev.id);
        }
        break;
      }

      case 'ArrowRight': {
        event.preventDefault();
        if (hasChildren) {
          if (!isExpanded) {
            // Expand collapsed node
            toggle(currentPage.id);
          } else {
            // Move to first child
            const firstChild = children[0];
            if (firstChild) {
              focusNode(firstChild.id);
              onSelect(firstChild.id);
            }
          }
        }
        break;
      }

      case 'ArrowLeft': {
        event.preventDefault();
        if (hasChildren && isExpanded) {
          // Collapse expanded node
          toggle(currentPage.id);
        } else if (currentPage.parentId) {
          // Move to parent
          focusNode(currentPage.parentId);
          onSelect(currentPage.parentId);
        }
        break;
      }

      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (currentPage) {
          onSelect(currentPage.id);
        }
        break;
      }

      default:
        break;
    }
  }

  if (roots.length === 0) {
    return <p className="text-muted-foreground p-2 text-sm">No pages yet.</p>;
  }

  return (
    <ul
      role="tree"
      aria-label="Pages"
      className="flex flex-col gap-0.5 outline-none"
      onKeyDown={handleKeyDown}
    >
      {roots.map((page) => (
        <TreeNode
          key={page.id}
          page={page}
          tree={tree}
          depth={0}
          selectedId={selectedId}
          effectiveFocusedId={effectiveFocusedId}
          collapsed={collapsed}
          itemRefs={itemRefs}
          onToggle={toggle}
          onSelect={onSelect}
          onFocus={setFocusedId}
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
  effectiveFocusedId,
  collapsed,
  itemRefs,
  onToggle,
  onSelect,
  onFocus,
}: {
  page: PageSummary;
  tree: PageTree;
  depth: number;
  selectedId: string | null;
  effectiveFocusedId: string | null;
  collapsed: Set<string>;
  itemRefs: React.RefObject<Map<string, HTMLDivElement>>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const children = tree.get(page.id) ?? [];
  const hasChildren = children.length > 0;
  const open = hasChildren && !collapsed.has(page.id);
  const isSelected = page.id === selectedId;
  const isFocused = page.id === effectiveFocusedId;

  return (
    <li role="none">
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? open : undefined}
        aria-level={depth + 1}
        tabIndex={isFocused ? 0 : -1}
        ref={(el) => {
          if (el && itemRefs.current) {
            itemRefs.current.set(page.id, el);
          } else if (itemRefs.current) {
            itemRefs.current.delete(page.id);
          }
        }}
        onClick={() => {
          onFocus(page.id);
          onSelect(page.id);
        }}
        onFocus={() => onFocus(page.id)}
        className={cn(
          'group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm cursor-pointer select-none transition-colors',
          isSelected
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-foreground hover:bg-muted',
          FOCUS_RING,
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(page.id);
            }}
            aria-label={open ? `Collapse ${page.title}` : `Expand ${page.title}`}
            className="text-muted-foreground hover:text-foreground -ml-1 rounded p-0.5 transition-colors"
          >
            <ChevronRight
              className={cn('size-3.5 transition-transform duration-150', open && 'rotate-90')}
              aria-hidden
            />
          </button>
        ) : (
          <FileText className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
        )}

        <span className="min-w-0 flex-1 truncate">{page.title}</span>
      </div>

      {open ? (
        <ul role="group" className="flex flex-col gap-0.5">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              page={child}
              tree={tree}
              depth={depth + 1}
              selectedId={selectedId}
              effectiveFocusedId={effectiveFocusedId}
              collapsed={collapsed}
              itemRefs={itemRefs}
              onToggle={onToggle}
              onSelect={onSelect}
              onFocus={onFocus}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
