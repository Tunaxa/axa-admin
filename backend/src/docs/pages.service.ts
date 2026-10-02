import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { CreatePageDto } from './dto/create-page.dto.js';
import type { UpdatePageDto } from './dto/update-page.dto.js';
import { Page, type PageDocument } from './schemas/page.schema.js';

/** A page's place in the tree, without its content. */
const SUMMARY = '-blocks';

/** The duplicate-key error MongoDB raises against a unique index. */
const DUPLICATE_KEY = 11000;

/**
 * Page reads and writes.
 *
 * Every query is filtered by `organizationId`, taken from the verified token
 * rather than from the request, so a caller cannot reach another tenant's
 * pages by guessing ids.
 *
 * `ancestors` is never accepted from a caller. It is derived from the parent
 * on create and recomputed on a move, because a tree whose paths can be set by
 * hand is a tree that will eventually disagree with itself.
 */
@Injectable()
export class PagesService {
  constructor(
    @InjectModel(Page.name) private readonly pages: Model<PageDocument>,
  ) {}

  async create(
    organizationId: string,
    authorId: string,
    dto: CreatePageDto,
  ): Promise<PageDocument> {
    const parentId = dto.parentId ?? null;
    const ancestors = await this.ancestorsUnder(organizationId, parentId);

    try {
      return await this.pages.create({
        organizationId,
        title: dto.title,
        slug: dto.slug,
        parentId,
        ancestors,
        order: dto.order ?? 0,
        blocks: dto.blocks ?? [],
        authorId,
      });
    } catch (cause: unknown) {
      throw this.asSlugConflict(cause, dto.slug);
    }
  }

  /**
   * The whole tenant's tree, without page content.
   *
   * One request rather than one per level: a sidebar needs every node to draw
   * itself, and the blocks it does not need are the bulk of a page.
   */
  list(organizationId: string): Promise<PageDocument[]> {
    return this.pages
      .find({ organizationId })
      .select(SUMMARY)
      .sort({ order: 1, title: 1 })
      .exec();
  }

  async findOne(organizationId: string, id: string): Promise<PageDocument> {
    const page = await this.pages.findOne({ _id: id, organizationId }).exec();

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  async update(
    organizationId: string,
    editorId: string,
    id: string,
    dto: UpdatePageDto,
  ): Promise<PageDocument> {
    const page = await this.findOne(organizationId, id);
    const moving =
      dto.parentId !== undefined &&
      String(dto.parentId ?? '') !== String(page.parentId ?? '');

    if (moving) {
      await this.move(organizationId, page, dto.parentId ?? null);
    }

    if (dto.title !== undefined) page.title = dto.title;
    if (dto.slug !== undefined) page.slug = dto.slug;
    if (dto.order !== undefined) page.order = dto.order;
    if (dto.blocks !== undefined) page.blocks = dto.blocks as never;

    page.lastEditedById = editorId;

    try {
      return await page.save();
    } catch (cause: unknown) {
      throw this.asSlugConflict(cause, dto.slug ?? page.slug);
    }
  }

  /**
   * Deletes a page and everything below it.
   *
   * The alternative — refusing while a page has children — leaves no way to
   * remove a section without walking it leaf by leaf. The count comes back in
   * the response, because a call that removed twelve pages should say so.
   */
  async remove(
    organizationId: string,
    id: string,
  ): Promise<{ deleted: number }> {
    const page = await this.findOne(organizationId, id);

    const descendants = await this.pages.deleteMany({
      organizationId,
      ancestors: page._id,
    });

    await this.pages.deleteOne({ _id: page._id, organizationId });

    return { deleted: descendants.deletedCount + 1 };
  }

  /**
   * Re-parents a page and rewrites the paths of everything beneath it.
   *
   * The descendants are rewritten in one pipelined `updateMany`: each one
   * keeps the part of its path that runs from this page downwards, and has the
   * old prefix swapped for the new one. Loading them to rewrite in the
   * application would be one write per descendant.
   */
  private async move(
    organizationId: string,
    page: PageDocument,
    newParentId: string | null,
  ): Promise<void> {
    if (newParentId && newParentId === String(page._id)) {
      throw new BadRequestException('A page cannot be its own parent');
    }

    const ancestors = await this.ancestorsUnder(organizationId, newParentId);

    if (ancestors.some((ancestor) => ancestor.equals(page._id))) {
      throw new BadRequestException('A page cannot be moved underneath itself');
    }

    const oldPrefixLength = page.ancestors.length + 1;

    page.parentId = newParentId ? new Types.ObjectId(newParentId) : null;
    page.ancestors = ancestors;

    await this.pages.updateMany(
      { organizationId, ancestors: page._id },
      [
        {
          $set: {
            ancestors: {
              $concatArrays: [
                [...ancestors, page._id],
                {
                  $slice: [
                    '$ancestors',
                    oldPrefixLength,
                    { $size: '$ancestors' },
                  ],
                },
              ],
            },
          },
        },
      ],
      { updatePipeline: true },
    );
  }

  /** The path a page sitting under `parentId` would have. */
  private async ancestorsUnder(
    organizationId: string,
    parentId: string | null,
  ): Promise<Types.ObjectId[]> {
    if (!parentId) {
      return [];
    }

    const parent = await this.pages
      .findOne({ _id: parentId, organizationId })
      .select('ancestors')
      .exec();

    if (!parent) {
      throw new BadRequestException(
        'Parent page not found in this organization',
      );
    }

    return [...parent.ancestors, parent._id];
  }

  /**
   * Turns MongoDB's duplicate-key error into a `409`.
   *
   * Catching the write rather than checking first: two callers creating the
   * same slug at once would both pass a check, and only the unique index can
   * actually decide.
   */
  private asSlugConflict(cause: unknown, slug: string): unknown {
    const isDuplicate =
      typeof cause === 'object' &&
      cause !== null &&
      (cause as { code?: number }).code === DUPLICATE_KEY;

    return isDuplicate
      ? new ConflictException(`A page with the slug "${slug}" already exists`)
      : cause;
  }
}
