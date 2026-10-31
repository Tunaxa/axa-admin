import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { AuthenticatedOnly } from '../auth/permissions.decorator.js';
import {
  NotificationsService,
  type NotificationView,
} from './notifications.service.js';

/**
 * Notifications feed.
 *
 * No per-feature permission: this is the recipient reading their own mail.
 * Scoped by `request.user.sub` + `request.user.org`, so the token identifies
 * both the recipient and the tenant — a user cannot read another one's feed.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @AuthenticatedOnly()
  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query('unread') unread?: string,
  ): Promise<NotificationView[]> {
    return this.notifications.list(request.user.org, request.user.sub, {
      unreadOnly: unread === 'true',
    });
  }

  @AuthenticatedOnly()
  @Get('unread-count')
  unread(@Req() request: AuthenticatedRequest): Promise<{ count: number }> {
    return this.notifications
      .unreadCount(request.user.org, request.user.sub)
      .then((count) => ({ count }));
  }

  @AuthenticatedOnly()
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ ok: boolean }> {
    return this.notifications.markRead(request.user.org, request.user.sub, id);
  }

  @AuthenticatedOnly()
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ count: number }> {
    return this.notifications.markAllRead(request.user.org, request.user.sub);
  }
}
