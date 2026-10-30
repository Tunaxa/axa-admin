'use client';

import * as React from 'react';
import { BookOpen, Copy, Edit3, Loader2, Plus, Search, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FOCUS_RING } from '@/lib/focus';
import { BlockEditor } from './block-editor';
import { createPage, fetchPage, fetchPages } from './docs-api';
import { PageContent } from './page-content';
import { DeletePageDialog, NewPageDialog, PageSearchDialog } from './page-dialogs';
import { buildTree, PageTreeNav } from './page-tree';
import type { Page, PageSummary } from './types';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-4 justify-center rounded border border-border bg-muted px-1 font-mono text-[10px]">
      {children}
    </kbd>
  );
}

export function DocsView() {
  const [pages, setPages] = React.useState<PageSummary[]>([]);
  const [loadingTree, setLoadingTree] = React.useState(true);
  const [treeError, setTreeError] = React.useState<string | null>(null);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState<Page | null>(null);
  const [loadingPage, setLoadingPage] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);

  const [isEditing, setIsEditing] = React.useState(false);

  // Dialog states
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [newPageOpen, setNewPageOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [duplicating, setDuplicating] = React.useState(false);

  // Fetch tree on mount
  React.useEffect(() => {
    let cancelled = false;

    fetchPages()
      .then((loaded) => {
        if (cancelled) return;
        setPages(loaded);
        setLoadingTree(false);
        if (loaded.length > 0 && loaded[0]) {
          setSelectedId(loaded[0].id);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTreeError(err instanceof Error ? err.message : 'Impossible de charger les pages');
        setLoadingTree(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch page details when selectedId changes
  React.useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;
    // Fetching bounded by selectedId: external-system sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingPage(true);
    setPageError(null);

    fetchPage(selectedId)
      .then((loaded) => {
        if (cancelled) return;
        setCurrentPage(loaded);
        setLoadingPage(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPageError(err instanceof Error ? err.message : 'Impossible de charger la page');
        setLoadingPage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const tree = React.useMemo(() => buildTree(pages), [pages]);

  // Global keyboard shortcuts on /docs: ⌘K, ⌘⇧N, ⌘⇧D, ⌘⇧⌫, ⌘E
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();

      // ⌘K: Quick search dialog
      if (key === 'k' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen((prev) => !prev);
        return;
      }

      // ⌘⇧N: New page at root
      if (key === 'n' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setNewPageOpen(true);
        return;
      }

      // ⌘⇧D: Duplicate current page
      if (key === 'd' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (currentPage) {
          void handleDuplicate();
        }
        return;
      }

      // ⌘⇧⌫ / ⌘⇧Delete: Delete current page
      if ((e.key === 'Backspace' || e.key === 'Delete') && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (currentPage) {
          setDeleteOpen(true);
        }
        return;
      }

      // ⌘E: Toggle edit/read mode
      if (key === 'e' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setIsEditing((prev) => !prev);
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  });

  async function handleDuplicate() {
    if (!currentPage || duplicating) return;
    setDuplicating(true);
    try {
      const randomSuffix = Math.random().toString(36).slice(2, 6);
      const newTitle = `${currentPage.title} (copie)`;
      const newSlug = `${currentPage.slug}-copie-${randomSuffix}`;

      const duplicated = await createPage({
        title: newTitle,
        slug: newSlug,
        parentId: currentPage.parentId,
        blocks: currentPage.blocks.map((b) => ({
          type: b.type,
          text: b.text,
          props: b.props ?? {},
        })),
      });

      setPages((prev) => [...prev, duplicated]);
      setSelectedId(duplicated.id);
      setCurrentPage(duplicated);
    } catch (err) {
      console.error('Failed to duplicate page:', err);
    } finally {
      setDuplicating(false);
    }
  }

  function handlePageCreated(created: Page) {
    setPages((prev) => [...prev, created]);
    setSelectedId(created.id);
    setCurrentPage(created);
    setIsEditing(true); // Open in edit mode so user can immediately write
  }

  function handlePageDeleted(deletedId: string) {
    setPages((prev) => {
      const remaining = prev.filter((p) => p.id !== deletedId && !p.ancestors.includes(deletedId));
      if (selectedId === deletedId) {
        setSelectedId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  }

  function handlePageUpdated(updated: Page) {
    setCurrentPage(updated);
    setPages((prev) => prev.map((p) => (p.id === updated.id ? { ...p, title: updated.title } : p)));
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      {/* Sticky Header with Toolbar matching calendar-view */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <h1 className="text-base font-semibold truncate max-w-sm">
          {currentPage ? currentPage.title : 'Documentation'}
        </h1>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className={`gap-1.5 text-xs text-muted-foreground ${FOCUS_RING}`}
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">Rechercher</span>
            <Kbd>⌘K</Kbd>
          </Button>

          <Button
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className={`gap-1.5 text-xs ${FOCUS_RING}`}
            title="Basculer lecture/édition (⌘E)"
          >
            {isEditing ? <BookOpen className="size-3.5" /> : <Edit3 className="size-3.5" />}
            <span className="hidden sm:inline">{isEditing ? 'Lecture' : 'Édition'}</span>
            <Kbd>⌘E</Kbd>
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!currentPage || duplicating}
            onClick={() => void handleDuplicate()}
            title="Dupliquer la page (⌘⇧D)"
            className={FOCUS_RING}
          >
            {duplicating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!currentPage}
            onClick={() => setDeleteOpen(true)}
            title="Supprimer la page (⌘⇧⌫)"
            className={`text-muted-foreground hover:text-destructive ${FOCUS_RING}`}
          >
            <Trash2 className="size-3.5" />
          </Button>

          <Button
            size="sm"
            onClick={() => setNewPageOpen(true)}
            className={`gap-1 text-xs ${FOCUS_RING}`}
            title="Nouvelle page à la racine (⌘⇧N)"
          >
            <Plus className="size-3.5" />
            <span>Nouvelle page</span>
          </Button>
        </div>

        {/* Shortcuts hint line under header */}
        <p className="w-full text-[11px] text-muted-foreground">
          Raccourcis : <Kbd>⌘K</Kbd> rechercher · <Kbd>⌘⇧N</Kbd> nouvelle page · <Kbd>⌘⇧D</Kbd>{' '}
          dupliquer · <Kbd>⌘⇧⌫</Kbd> supprimer · <Kbd>⌘E</Kbd> éditer/lire · <Kbd>/</Kbd> slash menu
        </p>
      </header>

      {/* Main split view: sidebar page tree + content/editor */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <nav
          aria-label="Arborescence des pages"
          className="shrink-0 overflow-y-auto border-b border-border p-3 md:w-64 md:border-r md:border-b-0"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pages
            </h2>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setNewPageOpen(true)}
              title="Nouvelle page"
              className="size-5 rounded text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3" />
            </Button>
          </div>

          {loadingTree ? (
            <p className="p-2 text-xs text-muted-foreground">Chargement de l&apos;arbre…</p>
          ) : treeError ? (
            <p className="p-2 text-xs text-destructive">{treeError}</p>
          ) : (
            <PageTreeNav tree={tree} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto bg-background">
          {loadingPage ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Chargement de la page…
            </div>
          ) : pageError ? (
            <div role="alert" className="p-6 text-sm text-destructive">
              {pageError}
            </div>
          ) : !currentPage ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
              <p className="text-sm text-muted-foreground">Aucune page sélectionnée.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewPageOpen(true)}
                className={`mt-3 ${FOCUS_RING}`}
              >
                <Plus className="size-3.5 mr-1" /> Créer une page
              </Button>
            </div>
          ) : isEditing ? (
            <BlockEditor
              key={`edit-${currentPage.id}`}
              page={currentPage}
              onPageUpdated={handlePageUpdated}
            />
          ) : (
            <PageContent key={`read-${currentPage.id}`} page={currentPage} />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <PageSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        pages={pages}
        onSelectPage={setSelectedId}
      />

      <NewPageDialog
        open={newPageOpen}
        onOpenChange={setNewPageOpen}
        onCreated={handlePageCreated}
      />

      {currentPage ? (
        <DeletePageDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          page={currentPage}
          onDeleted={handlePageDeleted}
        />
      ) : null}
    </section>
  );
}
