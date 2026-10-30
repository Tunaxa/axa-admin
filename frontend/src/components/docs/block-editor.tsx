'use client';

import * as React from 'react';
import {
  Check,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  Trash2,
} from 'lucide-react';
import { cn } from 'cn';

import { Button } from '@/components/ui/button';
import { FOCUS_RING } from '@/lib/focus';
import { updatePage } from './docs-api';
import type { Block, BlockType, EditorBlock, EditorBlockType, Page } from './types';

interface SlashOption {
  type: EditorBlockType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const SLASH_OPTIONS: SlashOption[] = [
  {
    type: 'heading_1',
    title: 'Titre 1',
    description: 'Grand titre de section (H1)',
    icon: Heading1,
    shortcut: '#',
  },
  {
    type: 'heading_2',
    title: 'Titre 2',
    description: 'Titre de sous-section (H2)',
    icon: Heading2,
    shortcut: '##',
  },
  {
    type: 'heading_3',
    title: 'Titre 3',
    description: 'Petit titre de sous-section (H3)',
    icon: Heading3,
    shortcut: '###',
  },
  {
    type: 'paragraph',
    title: 'Texte',
    description: 'Paragraphe de texte standard',
    icon: Pilcrow,
  },
  {
    type: 'bulleted_list_item',
    title: 'Liste à puces',
    description: 'Liste non ordonnée',
    icon: List,
    shortcut: '-',
  },
  {
    type: 'numbered_list_item',
    title: 'Liste numérotée',
    description: 'Liste séquentielle ordonnée',
    icon: ListOrdered,
    shortcut: '1.',
  },
  {
    type: 'todo',
    title: 'Tâche à faire',
    description: 'Case à cocher interactive',
    icon: CheckSquare,
    shortcut: '[]',
  },
  {
    type: 'quote',
    title: 'Citation',
    description: 'Bloc de citation mis en avant',
    icon: Quote,
    shortcut: '>',
  },
  {
    type: 'code',
    title: 'Bloc de code',
    description: 'Code source avec police monospace',
    icon: Code,
    shortcut: '```',
  },
  {
    type: 'divider',
    title: 'Séparateur',
    description: 'Ligne de séparation horizontale',
    icon: Minus,
    shortcut: '---',
  },
];

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBlocksFromPage(rawBlocks: Block[]): EditorBlock[] {
  if (!rawBlocks || rawBlocks.length === 0) {
    return [{ id: generateId(), type: 'paragraph', text: '', props: {} }];
  }

  return rawBlocks.map((b) => {
    const isTodo = b.type === 'bulleted_list_item' && Boolean(b.props?.todo);
    return {
      id: b.id || generateId(),
      type: isTodo ? 'todo' : b.type,
      text: b.text ?? '',
      props: b.props ?? {},
    };
  });
}

function sanitizeBlocksForWire(editorBlocks: EditorBlock[]): Array<{
  type: BlockType;
  text: string;
  props: Record<string, unknown>;
}> {
  return editorBlocks.map((b) => {
    if (b.type === 'todo') {
      return {
        type: 'bulleted_list_item',
        text: b.text,
        props: { ...b.props, todo: true },
      };
    }
    return {
      type: b.type as BlockType,
      text: b.text,
      props: b.props ?? {},
    };
  });
}

export function BlockEditor({
  page,
  onPageUpdated,
}: {
  page: Page;
  onPageUpdated?: (updated: Page) => void;
}) {
  const [blocks, setBlocks] = React.useState<EditorBlock[]>(() =>
    normalizeBlocksFromPage(page.blocks),
  );
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'error'>('saved');
  const [slashMenu, setSlashMenu] = React.useState<{
    blockId: string;
    query: string;
    highlightedIndex: number;
  } | null>(null);

  const blockRefs = React.useRef<Map<string, HTMLTextAreaElement | HTMLInputElement>>(new Map());
  const pendingFocusId = React.useRef<{ id: string; cursor?: 'start' | 'end' } | null>(null);
  const isFirstMount = React.useRef(true);

  // Focus management after block insertion/deletion
  React.useEffect(() => {
    if (pendingFocusId.current) {
      const { id, cursor } = pendingFocusId.current;
      const el = blockRefs.current.get(id);
      if (el) {
        el.focus();
        if (cursor === 'end') {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        } else if (cursor === 'start') {
          el.setSelectionRange(0, 0);
        }
      }
      pendingFocusId.current = null;
    }
  });

  // Debounced auto-save to backend
  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      const wireBlocks = sanitizeBlocksForWire(blocks);
      updatePage(page.id, { blocks: wireBlocks })
        .then((updated) => {
          setSaveStatus('saved');
          onPageUpdated?.(updated);
        })
        .catch(() => {
          setSaveStatus('error');
        });
    }, 800);

    return () => clearTimeout(timer);
  }, [blocks, page.id, onPageUpdated]);

  const filteredOptions = React.useMemo(() => {
    if (!slashMenu) return SLASH_OPTIONS;
    const q = slashMenu.query.toLowerCase().trim();
    if (!q) return SLASH_OPTIONS;
    return SLASH_OPTIONS.filter(
      (opt) =>
        opt.title.toLowerCase().includes(q) ||
        opt.description.toLowerCase().includes(q) ||
        opt.type.toLowerCase().includes(q) ||
        (opt.shortcut && opt.shortcut.includes(q)),
    );
  }, [slashMenu]);

  function updateBlock(id: string, updater: (prev: EditorBlock) => EditorBlock) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? updater(b) : b)));
  }

  function convertBlockType(id: string, newType: EditorBlockType, cleanedText?: string) {
    setBlocks((prev) => {
      const targetIndex = prev.findIndex((b) => b.id === id);
      if (targetIndex === -1) return prev;

      const target = prev[targetIndex];
      if (!target) return prev;

      const nextText = cleanedText !== undefined ? cleanedText : target.text;

      let nextProps = { ...target.props };
      if (newType === 'todo') {
        nextProps = { ...nextProps, todo: true, checked: Boolean(nextProps.checked) };
      } else {
        delete nextProps.todo;
        delete nextProps.checked;
      }

      if (newType === 'divider') {
        // A divider is visual-only; create an empty paragraph right after
        const dividerBlock: EditorBlock = {
          id: target.id,
          type: 'divider',
          text: '',
          props: {},
        };
        const nextParagraph: EditorBlock = {
          id: generateId(),
          type: 'paragraph',
          text: '',
          props: {},
        };
        pendingFocusId.current = { id: nextParagraph.id, cursor: 'start' };
        const copy = [...prev];
        copy.splice(targetIndex, 1, dividerBlock, nextParagraph);
        return copy;
      }

      const updatedBlock: EditorBlock = {
        id: target.id,
        type: newType,
        text: nextText,
        props: nextProps,
      };

      const copy = [...prev];
      copy[targetIndex] = updatedBlock;
      pendingFocusId.current = { id: target.id, cursor: 'end' };
      return copy;
    });

    setSlashMenu(null);
  }

  function handleTextChange(block: EditorBlock, newText: string) {
    // 1. Check for on-the-fly markdown shortcuts in paragraph blocks
    if (block.type === 'paragraph') {
      if (newText.startsWith('# ')) {
        convertBlockType(block.id, 'heading_1', newText.slice(2));
        return;
      }
      if (newText.startsWith('## ')) {
        convertBlockType(block.id, 'heading_2', newText.slice(3));
        return;
      }
      if (newText.startsWith('### ')) {
        convertBlockType(block.id, 'heading_3', newText.slice(4));
        return;
      }
      if (newText.startsWith('- ') || newText.startsWith('* ')) {
        convertBlockType(block.id, 'bulleted_list_item', newText.slice(2));
        return;
      }
      if (/^1\.\s/.test(newText)) {
        convertBlockType(block.id, 'numbered_list_item', newText.replace(/^1\.\s/, ''));
        return;
      }
      if (newText.startsWith('[] ') || newText.startsWith('[ ] ')) {
        const offset = newText.startsWith('[ ] ') ? 4 : 3;
        convertBlockType(block.id, 'todo', newText.slice(offset));
        return;
      }
      if (newText.startsWith('> ')) {
        convertBlockType(block.id, 'quote', newText.slice(2));
        return;
      }
      if (newText.startsWith('``` ') || newText === '```') {
        convertBlockType(block.id, 'code', newText.replace(/^```\s?/, ''));
        return;
      }
      if (newText === '---' || newText.startsWith('--- ')) {
        convertBlockType(block.id, 'divider', '');
        return;
      }
    }

    // 2. Check for slash command trigger
    if (newText.startsWith('/')) {
      const query = newText.slice(1);
      setSlashMenu({
        blockId: block.id,
        query,
        highlightedIndex: 0,
      });
    } else if (slashMenu && slashMenu.blockId === block.id) {
      setSlashMenu(null);
    }

    updateBlock(block.id, (b) => ({ ...b, text: newText }));
  }

  function handleKeyDown(
    block: EditorBlock,
    index: number,
    event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) {
    // If slash menu is active for this block
    if (slashMenu && slashMenu.blockId === block.id) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashMenu((curr) => {
          if (!curr) return null;
          const next = (curr.highlightedIndex + 1) % Math.max(1, filteredOptions.length);
          return { ...curr, highlightedIndex: next };
        });
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashMenu((curr) => {
          if (!curr) return null;
          const prevIdx =
            (curr.highlightedIndex - 1 + filteredOptions.length) %
            Math.max(1, filteredOptions.length);
          return { ...curr, highlightedIndex: prevIdx };
        });
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const selectedOption = filteredOptions[slashMenu.highlightedIndex];
        if (selectedOption) {
          convertBlockType(block.id, selectedOption.type, '');
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setSlashMenu(null);
        return;
      }
    }

    // Enter key handling
    if (event.key === 'Enter' && !event.shiftKey) {
      // In code blocks, Enter simply inserts a newline
      if (block.type === 'code') {
        return;
      }

      event.preventDefault();

      // Empty list or todo converts back to paragraph
      if (
        (block.type === 'bulleted_list_item' ||
          block.type === 'numbered_list_item' ||
          block.type === 'todo' ||
          block.type === 'quote') &&
        block.text.trim() === ''
      ) {
        convertBlockType(block.id, 'paragraph', '');
        return;
      }

      // Inherit list types on enter if non-empty
      let newType: EditorBlockType = 'paragraph';
      if (block.type === 'bulleted_list_item') newType = 'bulleted_list_item';
      else if (block.type === 'numbered_list_item') newType = 'numbered_list_item';
      else if (block.type === 'todo') newType = 'todo';

      const newBlock: EditorBlock = {
        id: generateId(),
        type: newType,
        text: '',
        props: newType === 'todo' ? { todo: true, checked: false } : {},
      };

      setBlocks((prev) => {
        const copy = [...prev];
        copy.splice(index + 1, 0, newBlock);
        return copy;
      });

      pendingFocusId.current = { id: newBlock.id, cursor: 'start' };
      setSlashMenu(null);
      return;
    }

    // Backspace on empty block
    if (event.key === 'Backspace' && block.text === '') {
      if (block.type !== 'paragraph') {
        event.preventDefault();
        convertBlockType(block.id, 'paragraph', '');
        return;
      }

      if (blocks.length > 1) {
        event.preventDefault();
        const prevBlock = blocks[index - 1];
        if (prevBlock) {
          pendingFocusId.current = { id: prevBlock.id, cursor: 'end' };
        }
        setBlocks((prev) => prev.filter((b) => b.id !== block.id));
        setSlashMenu(null);
        return;
      }
    }

    // Up / Down arrow block jumping when not in slash menu
    if (!slashMenu) {
      const target = event.currentTarget;
      if (event.key === 'ArrowUp' && target.selectionStart === 0 && index > 0) {
        event.preventDefault();
        const prevBlock = blocks[index - 1];
        if (prevBlock) {
          pendingFocusId.current = { id: prevBlock.id, cursor: 'end' };
          const el = blockRefs.current.get(prevBlock.id);
          el?.focus();
        }
      } else if (
        event.key === 'ArrowDown' &&
        target.selectionEnd === target.value.length &&
        index < blocks.length - 1
      ) {
        event.preventDefault();
        const nextBlock = blocks[index + 1];
        if (nextBlock) {
          pendingFocusId.current = { id: nextBlock.id, cursor: 'start' };
          const el = blockRefs.current.get(nextBlock.id);
          el?.focus();
        }
      }
    }
  }

  function insertBlockBelow(index: number) {
    const newBlock: EditorBlock = {
      id: generateId(),
      type: 'paragraph',
      text: '',
      props: {},
    };
    setBlocks((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, newBlock);
      return copy;
    });
    pendingFocusId.current = { id: newBlock.id, cursor: 'start' };
  }

  function deleteBlock(id: string) {
    if (blocks.length <= 1) {
      setBlocks([{ id: generateId(), type: 'paragraph', text: '', props: {} }]);
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
      {/* Save status pill */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {saveStatus === 'saving' ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Enregistrement…
            </span>
          ) : saveStatus === 'saved' ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="size-3" /> Enregistré
            </span>
          ) : (
            <span className="text-destructive">Erreur de sauvegarde</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tapez <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">/</kbd> pour le
          menu de blocs
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {blocks.map((block, index) => (
          <div key={block.id} className="group relative flex items-start gap-1.5 py-0.5">
            {/* Hover block controls */}
            <div className="absolute -left-12 top-1 hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
              <Button
                variant="ghost"
                size="icon-xs"
                tabIndex={-1}
                onClick={() => insertBlockBelow(index)}
                title="Ajouter un bloc en dessous"
                className="size-5 rounded text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3" />
              </Button>
              {blocks.length > 1 ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  tabIndex={-1}
                  onClick={() => deleteBlock(block.id)}
                  title="Supprimer ce bloc"
                  className="size-5 rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </Button>
              ) : null}
            </div>

            {/* Block content based on type */}
            <div className="min-w-0 flex-1">
              <BlockItem
                block={block}
                index={index}
                blockRefs={blockRefs}
                onChange={(text) => handleTextChange(block, text)}
                onKeyDown={(e) => handleKeyDown(block, index, e)}
                onToggleTodo={() => {
                  const currChecked = Boolean(block.props?.checked);
                  updateBlock(block.id, (b) => ({
                    ...b,
                    props: { ...b.props, checked: !currChecked },
                  }));
                }}
              />

              {/* Slash Command Floating Menu */}
              {slashMenu && slashMenu.blockId === block.id ? (
                <div
                  role="menu"
                  aria-label="Types de blocs"
                  className="absolute z-50 mt-1 max-h-72 w-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
                >
                  <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                    Types de blocs
                  </div>
                  {filteredOptions.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                      Aucun type correspondant
                    </div>
                  ) : (
                    filteredOptions.map((opt, optIndex) => {
                      const Icon = opt.icon;
                      const isHighlighted = optIndex === slashMenu.highlightedIndex;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            convertBlockType(block.id, opt.type, '');
                          }}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                            isHighlighted
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-foreground hover:bg-muted',
                          )}
                        >
                          <div className="flex size-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
                            <Icon className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{opt.title}</div>
                            <div className="truncate text-[10px] text-muted-foreground">
                              {opt.description}
                            </div>
                          </div>
                          {opt.shortcut ? (
                            <kbd className="rounded border bg-muted px-1 font-mono text-[9px] text-muted-foreground">
                              {opt.shortcut}
                            </kbd>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockItem({
  block,
  index,
  blockRefs,
  onChange,
  onKeyDown,
  onToggleTodo,
}: {
  block: EditorBlock;
  index: number;
  blockRefs: React.RefObject<Map<string, HTMLTextAreaElement | HTMLInputElement>>;
  onChange: (text: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onToggleTodo: () => void;
}) {
  const setRef = (el: HTMLTextAreaElement | HTMLInputElement | null) => {
    if (el && blockRefs.current) {
      blockRefs.current.set(block.id, el);
    } else if (blockRefs.current) {
      blockRefs.current.delete(block.id);
    }
  };

  // Auto-resize textarea
  const adjustHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
    onChange(target.value);
  };

  switch (block.type) {
    case 'heading_1':
      return (
        <input
          ref={setRef}
          type="text"
          value={block.text}
          placeholder="Titre 1"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full bg-transparent text-2xl font-bold tracking-tight placeholder:text-muted-foreground/40 outline-none',
            FOCUS_RING,
          )}
        />
      );

    case 'heading_2':
      return (
        <input
          ref={setRef}
          type="text"
          value={block.text}
          placeholder="Titre 2"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full bg-transparent text-xl font-semibold tracking-tight placeholder:text-muted-foreground/40 outline-none',
            FOCUS_RING,
          )}
        />
      );

    case 'heading_3':
      return (
        <input
          ref={setRef}
          type="text"
          value={block.text}
          placeholder="Titre 3"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full bg-transparent text-base font-semibold tracking-tight placeholder:text-muted-foreground/40 outline-none',
            FOCUS_RING,
          )}
        />
      );

    case 'bulleted_list_item':
      return (
        <div className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/70" />
          <textarea
            ref={setRef}
            rows={1}
            value={block.text}
            placeholder="Élément de liste…"
            onChange={adjustHeight}
            onKeyDown={onKeyDown}
            className={cn(
              'w-full resize-none overflow-hidden bg-transparent text-sm leading-6 placeholder:text-muted-foreground/40 outline-none',
              FOCUS_RING,
            )}
          />
        </div>
      );

    case 'numbered_list_item':
      return (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 select-none font-mono text-xs text-muted-foreground">
            {index + 1}.
          </span>
          <textarea
            ref={setRef}
            rows={1}
            value={block.text}
            placeholder="Élément numéroté…"
            onChange={adjustHeight}
            onKeyDown={onKeyDown}
            className={cn(
              'w-full resize-none overflow-hidden bg-transparent text-sm leading-6 placeholder:text-muted-foreground/40 outline-none',
              FOCUS_RING,
            )}
          />
        </div>
      );

    case 'todo': {
      const isChecked = Boolean(block.props?.checked);
      return (
        <div className="flex items-start gap-2">
          <button
            type="button"
            tabIndex={-1}
            onClick={onToggleTodo}
            className={cn(
              'mt-1 flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
              isChecked
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/50 hover:border-foreground',
            )}
          >
            {isChecked ? <Check className="size-3" /> : null}
          </button>
          <textarea
            ref={setRef}
            rows={1}
            value={block.text}
            placeholder="Tâche à faire…"
            onChange={adjustHeight}
            onKeyDown={onKeyDown}
            className={cn(
              'w-full resize-none overflow-hidden bg-transparent text-sm leading-6 placeholder:text-muted-foreground/40 outline-none',
              isChecked && 'text-muted-foreground line-through',
              FOCUS_RING,
            )}
          />
        </div>
      );
    }

    case 'quote':
      return (
        <div className="border-l-2 border-primary/50 pl-3">
          <textarea
            ref={setRef}
            rows={1}
            value={block.text}
            placeholder="Citation vide…"
            onChange={adjustHeight}
            onKeyDown={onKeyDown}
            className={cn(
              'w-full resize-none overflow-hidden bg-transparent text-sm italic leading-6 placeholder:text-muted-foreground/40 outline-none',
              FOCUS_RING,
            )}
          />
        </div>
      );

    case 'code':
      return (
        <div className="rounded-md border border-border bg-muted/60 p-2 font-mono">
          <textarea
            ref={setRef}
            rows={3}
            value={block.text}
            placeholder="// Code source…"
            onChange={adjustHeight}
            onKeyDown={onKeyDown}
            className={cn(
              'w-full resize-y bg-transparent font-mono text-xs leading-5 placeholder:text-muted-foreground/40 outline-none',
              FOCUS_RING,
            )}
          />
        </div>
      );

    case 'divider':
      return (
        <div className="py-2">
          <hr className="border-t border-border" />
        </div>
      );

    case 'paragraph':
    default:
      return (
        <textarea
          ref={setRef}
          rows={1}
          value={block.text}
          placeholder="Écrivez du texte ou tapez '/' pour insérer un bloc…"
          onChange={adjustHeight}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full resize-none overflow-hidden bg-transparent text-sm leading-6 placeholder:text-muted-foreground/40 outline-none',
            FOCUS_RING,
          )}
        />
      );
  }
}
