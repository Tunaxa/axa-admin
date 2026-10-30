/**
 * The kinds of content a page can hold.
 *
 * Listed rather than left open so a typo cannot create a block type nothing
 * knows how to render.
 */
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

/** One piece of content on a page, as it is stored in the `blocks` JSON column. */
export interface Block {
  type: BlockType;
  text: string;
  /** Per-type extras: `language` on `code`, `url` / `alt` on `image`, `icon` on `callout`. */
  props: Record<string, unknown>;
}
