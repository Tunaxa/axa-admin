'use client';

import * as React from 'react';
import { FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FOCUS_RING } from '@/lib/focus';
import { createPage, deletePage } from './docs-api';
import type { Page, PageSummary } from './types';

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'page'
  );
}

export function PageSearchDialog({
  open,
  onOpenChange,
  pages,
  onSelectPage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: PageSummary[];
  onSelectPage: (id: string) => void;
}) {
  const [search, setSearch] = React.useState('');

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rechercher une page"
      description="Recherchez parmi toutes les pages de documentation"
    >
      <Command>
        <CommandInput
          placeholder="Rechercher par titre ou URL (/slug)…"
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>Aucune page trouvée.</CommandEmpty>
          <CommandGroup heading="Pages de documentation">
            {pages.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.title} ${p.slug}`}
                onSelect={() => {
                  onSelectPage(p.id);
                  onOpenChange(false);
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium truncate">{p.title}</span>
                <span className="ml-auto text-xs text-muted-foreground font-mono truncate">
                  /{p.slug}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

export function NewPageDialog({
  open,
  onOpenChange,
  parentId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
  onCreated: (page: Page) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <NewPageDialogContent
          onOpenChange={onOpenChange}
          parentId={parentId}
          onCreated={onCreated}
        />
      ) : null}
    </Dialog>
  );
}

function NewPageDialogContent({
  onOpenChange,
  parentId,
  onCreated,
}: {
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
  onCreated: (page: Page) => void;
}) {
  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugEdited) {
      setSlug(slugify(val));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Le titre est obligatoire');
      return;
    }
    const cleanSlug = slugify(slug || title);
    if (!cleanSlug) {
      setError('Le slug est invalide');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await createPage({
        title: title.trim(),
        slug: cleanSlug,
        parentId: parentId ?? null,
        blocks: [
          {
            type: 'paragraph',
            text: '',
            props: {},
          },
        ],
      });
      onCreated(created);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer la page');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Nouvelle page de documentation</DialogTitle>
        <DialogDescription>
          Créez une nouvelle page à la racine de la documentation.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="page-title" className="text-xs font-medium">
            Titre de la page <span className="text-destructive">*</span>
          </label>
          <Input
            id="page-title"
            value={title}
            placeholder="ex: Guide de déploiement"
            onChange={(e) => handleTitleChange(e.target.value)}
            autoFocus
            className={FOCUS_RING}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="page-slug" className="text-xs font-medium">
            Identifiant URL (slug) <span className="text-destructive">*</span>
          </label>
          <Input
            id="page-slug"
            value={slug}
            placeholder="guide-de-deploiement"
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value);
            }}
            className={FOCUS_RING}
          />
          <p className="text-[11px] text-muted-foreground">
            Format : minuscules séparées par des tirets (a-z, 0-9).
          </p>
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className={FOCUS_RING}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={loading} className={FOCUS_RING}>
            {loading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
            Créer la page
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function DeletePageDialog({
  open,
  onOpenChange,
  page,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: PageSummary;
  onDeleted: (id: string) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await deletePage(page.id);
      onDeleted(page.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la suppression');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer la page ?</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. La page{' '}
            <strong className="text-foreground">« {page.title} »</strong> ainsi que toutes ses
            sous-pages seront définitivement supprimées.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className={FOCUS_RING}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className={FOCUS_RING}
          >
            {loading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
