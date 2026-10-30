import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type DocsPage } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import type { Block } from './block.types.js';
import type { CreatePageDto } from './dto/create-page.dto.js';
import type { UpdatePageDto } from './dto/update-page.dto.js';

/** Page in the tree with `blocks` stripped — the sidebar payload. */
export type PageSummary = Omit<DocsPage, 'blocks'>;

const SUMMARY_SELECT = {
  id: true,
  organizationId: true,
  title: true,
  slug: true,
  parentId: true,
  ancestors: true,
  order: true,
  authorId: true,
  lastEditedById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DocsPageSelect;

function normaliseBlocks(blocks: CreatePageDto['blocks']): Block[] {
  return (blocks ?? []).map((b) => ({
    type: b.type,
    text: b.text ?? '',
    props: b.props ?? {},
  }));
}

/**
 * Page reads and writes.
 *
 * Every query is filtered by `organizationId`, taken from the verified token
 * rather than from the request, so a caller cannot reach another tenant's
 * pages by guessing ids.
 *
 * `ancestors` is never accepted from a caller. It is derived from the parent
 * on create and recomputed on a move, because a tree whose paths can be set
 * by hand is a tree that will eventually disagree with itself.
 */
@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    authorId: string,
    dto: CreatePageDto,
  ): Promise<DocsPage> {
    const parentId = dto.parentId ?? null;
    const ancestors = await this.ancestorsUnder(organizationId, parentId);

    try {
      return await this.prisma.docsPage.create({
        data: {
          organizationId,
          title: dto.title,
          slug: dto.slug,
          parentId,
          ancestors,
          order: dto.order ?? 0,
          blocks: normaliseBlocks(
            dto.blocks,
          ) as unknown as Prisma.InputJsonValue,
          authorId,
        },
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
  list(organizationId: string): Promise<PageSummary[]> {
    return this.prisma.docsPage.findMany({
      where: { organizationId },
      select: SUMMARY_SELECT,
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });
  }

  async findOne(organizationId: string, id: string): Promise<DocsPage> {
    const page = await this.prisma.docsPage.findFirst({
      where: { id, organizationId },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async update(
    organizationId: string,
    editorId: string,
    id: string,
    dto: UpdatePageDto,
  ): Promise<DocsPage> {
    const page = await this.findOne(organizationId, id);
    const moving =
      dto.parentId !== undefined &&
      (dto.parentId ?? null) !== (page.parentId ?? null);

    const data: Prisma.DocsPageUpdateInput = {
      lastEditedBy: { connect: { id: editorId } },
    };

    if (moving) {
      const nextAncestors = await this.recomputeMove(
        organizationId,
        page,
        dto.parentId ?? null,
      );
      data.parent = dto.parentId
        ? { connect: { id: dto.parentId } }
        : { disconnect: true };
      data.ancestors = { set: nextAncestors };
    }

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.blocks !== undefined) {
      data.blocks = normaliseBlocks(
        dto.blocks,
      ) as unknown as Prisma.InputJsonValue;
    }

    try {
      return await this.prisma.docsPage.update({ where: { id }, data });
    } catch (cause: unknown) {
      throw this.asSlugConflict(cause, dto.slug ?? page.slug);
    }
  }

  /**
   * Deletes a page and everything below it.
   *
   * `onDelete: SetNull` on `parentId` plus a manual descendant pass — a cascade
   * on the self-relation would need a recursive FK, which Postgres does not
   * do. The count comes back in the response because a call that removed
   * twelve pages should say so.
   */
  async remove(
    organizationId: string,
    id: string,
  ): Promise<{ deleted: number }> {
    const page = await this.findOne(organizationId, id);

    const descendants = await this.prisma.docsPage.deleteMany({
      where: { organizationId, ancestors: { has: page.id } },
    });

    await this.prisma.docsPage.delete({ where: { id: page.id } });

    return { deleted: descendants.count + 1 };
  }

  /**
   * Re-parents a page and rewrites the paths of everything beneath it.
   *
   * The descendants are fetched once and rewritten in a transaction: each one
   * keeps the part of its path that runs from this page downwards, and has
   * the old prefix swapped for the new one. Postgres has no recursive array
   * update expression, so the rewrite happens in the application — bounded by
   * the subtree size, which is small for a documentation hierarchy.
   */
  private async recomputeMove(
    organizationId: string,
    page: DocsPage,
    newParentId: string | null,
  ): Promise<string[]> {
    if (newParentId && newParentId === page.id) {
      throw new BadRequestException('A page cannot be its own parent');
    }

    const ancestors = await this.ancestorsUnder(organizationId, newParentId);
    if (ancestors.includes(page.id)) {
      throw new BadRequestException('A page cannot be moved underneath itself');
    }

    const descendants = await this.prisma.docsPage.findMany({
      where: { organizationId, ancestors: { has: page.id } },
      select: { id: true, ancestors: true },
    });

    const newPrefix = [...ancestors, page.id];
    const oldPrefixLength = page.ancestors.length + 1; // +1 for the page itself

    await this.prisma.$transaction(
      descendants.map((d) =>
        this.prisma.docsPage.update({
          where: { id: d.id },
          data: {
            ancestors: {
              set: [...newPrefix, ...d.ancestors.slice(oldPrefixLength)],
            },
          },
        }),
      ),
    );

    return ancestors;
  }

  /** The path a page sitting under `parentId` would have. */
  private async ancestorsUnder(
    organizationId: string,
    parentId: string | null,
  ): Promise<string[]> {
    if (!parentId) return [];
    const parent = await this.prisma.docsPage.findFirst({
      where: { id: parentId, organizationId },
      select: { id: true, ancestors: true },
    });
    if (!parent) {
      throw new BadRequestException(
        'Parent page not found in this organization',
      );
    }
    return [...parent.ancestors, parent.id];
  }

  /**
   * Turns Prisma's unique-constraint error into a `409`.
   *
   * Catching the write rather than checking first: two callers creating the
   * same slug at once would both pass a check, and only the unique index can
   * actually decide.
   */
  private asSlugConflict(cause: unknown, slug: string): unknown {
    if (
      cause instanceof Prisma.PrismaClientKnownRequestError &&
      cause.code === 'P2002'
    ) {
      return new ConflictException(
        `A page with the slug "${slug}" already exists`,
      );
    }
    return cause;
  }
}
