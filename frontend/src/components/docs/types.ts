/** Page shapes, mirroring the `/docs/pages` responses. */

export const BLOCK_TYPES = [
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'bulleted_list_item',
  'numbered_list_item',
  'quote',
  'callout',
  'code',
  'divider',
  'image',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  props: Record<string, unknown>;
}

export type EditorBlockType = BlockType | 'todo';

export interface EditorBlock {
  id: string;
  type: EditorBlockType;
  text: string;
  props: Record<string, unknown>;
}

/** A node of the tree, as `GET /docs/pages` returns it — without content. */
export interface PageSummary {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  ancestors: string[];
  order: number;
}

/** One page with its content, as `GET /docs/pages/:id` returns it. */
export interface Page extends PageSummary {
  blocks: Block[];
  updatedAt: string;
}

export interface CreatePageInput {
  title: string;
  slug: string;
  parentId?: string | null;
  order?: number;
  blocks?: Array<{
    type: BlockType;
    text?: string;
    props?: Record<string, unknown>;
  }>;
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  parentId?: string | null;
  order?: number;
  blocks?: Array<{
    type: BlockType;
    text?: string;
    props?: Record<string, unknown>;
  }>;
}
