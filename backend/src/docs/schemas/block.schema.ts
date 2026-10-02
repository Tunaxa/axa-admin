import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { stripMongoId } from './strip-mongo-id.js';

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

/**
 * One piece of content on a page.
 *
 * Blocks are embedded in their page rather than stored in their own
 * collection: a page is what gets read, edited and permissioned, and a block
 * outside its page means nothing. Embedding also makes a save atomic, so a
 * page can never be half-written.
 *
 * Mongo gives each block its own `_id`, which is what anchors and links point
 * at. It survives edits to the block's text and every rewrite of the page.
 */
@Schema({
  _id: true,
  versionKey: false,
  toJSON: { virtuals: true, transform: stripMongoId },
})
export class Block {
  @Prop({ required: true, enum: BLOCK_TYPES })
  type!: BlockType;

  /**
   * The block's text. Empty for blocks that carry none, such as `divider`.
   *
   * Not `required`: Mongoose treats an empty string as missing, so requiring
   * it would make a divider — a block that is defined as carrying no text —
   * impossible to save. The default keeps it a string either way.
   */
  @Prop({ type: String, default: '' })
  text!: string;

  /**
   * The fields that only some block types have — `language` on `code`, `url`
   * and `alt` on `image`, `icon` on `callout`.
   *
   * Deliberately untyped: a discriminated union per block type would have to
   * be extended in the schema every time the editor gains a block, and the
   * rule that matters — which keys a type accepts — belongs with the endpoint
   * that writes them, where a bad value can be rejected with a 400.
   */
  @Prop({ type: Object, default: {} })
  props!: Record<string, unknown>;
}

export const BlockSchema = SchemaFactory.createForClass(Block);
