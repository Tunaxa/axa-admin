import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationType,
  type Notification,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

export interface PushInput {
  organizationId: string;
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
  actor: { id: string; name: string } | null;
}

const DEFAULT_LIMIT = 50;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record one notification. Called from feature services (issues, requests,
   * team) — never from a controller. Fire-and-forget: a logged failure must
   * not take down the write that triggered the notification.
   */
  async push(input: PushInput): Promise<Notification | null> {
    try {
      return await this.prisma.notification.create({
        data: {
          organizationId: input.organizationId,
          recipientId: input.recipientId,
          actorId: input.actorId ?? null,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          link: input.link ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to push notification to ${input.recipientId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /** Fan a single event out to several recipients, deduped. */
  async pushMany(
    recipients: string[],
    base: Omit<PushInput, 'recipientId'>,
  ): Promise<number> {
    const unique = Array.from(new Set(recipients));
    const results = await Promise.all(
      unique.map((recipientId) => this.push({ ...base, recipientId })),
    );
    return results.filter((r) => r !== null).length;
  }

  async list(
    organizationId: string,
    recipientId: string,
    opts: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<NotificationView[]> {
    const where: Prisma.NotificationWhereInput = {
      organizationId,
      recipientId,
    };
    if (opts.unreadOnly) where.readAt = null;

    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? DEFAULT_LIMIT,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        readAt: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
      },
    });

    return rows;
  }

  unreadCount(organizationId: string, recipientId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { organizationId, recipientId, readAt: null },
    });
  }

  async markRead(
    organizationId: string,
    recipientId: string,
    id: string,
  ): Promise<{ ok: boolean }> {
    const result = await this.prisma.notification.updateMany({
      where: { id, organizationId, recipientId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: result.count === 1 };
  }

  async markAllRead(
    organizationId: string,
    recipientId: string,
  ): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { organizationId, recipientId, readAt: null },
      data: { readAt: new Date() },
    });
    return { count: result.count };
  }
}
