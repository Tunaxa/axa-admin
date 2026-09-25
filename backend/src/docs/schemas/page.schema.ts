import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

import { Block, BlockSchema } from './block.schema.js';

export type PageDocument = HydratedDocument<Page>;

/**
 * A documentation page, and its place in the page tree.
 *
 * The tree is stored twice on purpose: `parentId` for the edge, `ancestors`
 * for the whole path from the root down. `parentId` alone would need one query
 * per level to expand a branch or build a breadcrumb; `ancestors` answers both
 * in a single indexed read. The cost is that moving a page has to rewrite the
 * `ancestors` of everything beneath it, which is the rarer operation.
 *
 * `organizationId` and the two user ids are UUIDs from PostgreSQL. Mongo cannot
 * hold a foreign key to another database, so nothing here cascades — see the
 * README.
 */
@Schema({ collection: 'pages', timestamps: true, versionKey: false })
export class Page {
  /** The owning tenant, from the verified token — never from a request body. */
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  /**
   * The page's URL segment.
   *
   * Unique per tenant rather than per parent, so `/docs/<slug>` addresses a
   * page wherever it sits. Moving a page in the tree then does not break links
   * to it, which is the failure a nested path would guarantee.
   */
  @Prop({ required: true, trim: true, lowercase: true })
  slug!: string;

  /** The page directly above this one. Null for a page at the tree's root. */
  @Prop({ type: SchemaTypes.ObjectId, ref: Page.name, default: null })
  parentId!: Types.ObjectId | null;

  /**
   * Every page above this one, ordered root first.
   *
   * Ordered, so it is the breadcrumb as well as the subtree filter.
   */
  @Prop({ type: [SchemaTypes.ObjectId], ref: Page.name, default: [] })
  ancestors!: Types.ObjectId[];

  /** Position among its siblings. Sparse on purpose, so an insert is one write. */
  @Prop({ required: true, default: 0 })
  order!: number;

  /** The page's content, in reading order. */
  @Prop({ type: [BlockSchema], default: [] })
  blocks!: Block[];

  /** The PostgreSQL user who created the page. */
  @Prop({ required: true })
  authorId!: string;

  /**
   * The PostgreSQL user who last edited it, null until someone else does.
   *
   * `type` is explicit because the property is a union, which Mongoose has no
   * way to infer from the emitted metadata.
   */
  @Prop({ type: String, default: null })
  lastEditedById!: string | null;
}

export const PageSchema = SchemaFactory.createForClass(Page);

// One level of the sidebar: a tenant's children of one page, in order.
PageSchema.index({ organizationId: 1, parentId: 1, order: 1 });

// Everything below a page, for expanding a branch, moving it or deleting it.
PageSchema.index({ organizationId: 1, ancestors: 1 });

// `/docs/<slug>` has to resolve to exactly one page in the tenant. Two tenants
// may both have a `conventions` page; one tenant may not have two.
PageSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
