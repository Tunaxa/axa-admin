import {
  Body,
  Controller,
  Delete,
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
import type { ActivityEvent, Issue } from '@prisma/client';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CreateIssueDto } from './dto/create-issue.dto.js';
import { ListIssuesQuery } from './dto/list-issues.query.js';
import { ResolveIssuesQuery } from './dto/resolve-issues.query.js';
import { UpdateIssueDto } from './dto/update-issue.dto.js';
import { IssuesService } from './issues.service.js';

/**
 * The tenant comes from the verified token (`org`), never from the request, so
 * every route below is automatically scoped to the caller's organization.
 */
@Controller('issues')
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @RequirePermissions('work:write')
  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateIssueDto,
  ): Promise<Issue> {
    return this.issues.create(request.user.org, dto);
  }

  /**
   * Resolves what a branch name refers to.
   *
   * `?text=` takes a whole branch name or pull request title and answers with
   * the issues it mentions; `?key=` takes one key. The first is what the
   * GitHub webhook will call, the second is what a person looking up AXA-123
   * needs.
   */
  @RequirePermissions('work:read')
  @Get('resolve')
  resolve(
    @Req() request: AuthenticatedRequest,
    @Query() query: ResolveIssuesQuery,
  ): Promise<Issue[]> {
    return query.key
      ? this.issues
          .findByKey(request.user.org, query.key)
          .then((issue) => [issue])
      : this.issues.findByText(request.user.org, query.text ?? '');
  }

  @RequirePermissions('work:read')
  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListIssuesQuery,
  ): Promise<Issue[]> {
    return this.issues.list(request.user.org, query);
  }

  @RequirePermissions('work:write')
  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIssueDto,
  ): Promise<Issue> {
    return this.issues.update(request.user.org, request.user.sub, id, dto);
  }

  /** The issue's activity feed, newest first. */
  @RequirePermissions('work:read')
  @Get(':id/activity')
  activity(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ActivityEvent[]> {
    return this.issues.activityFor(request.user.org, id);
  }

  @RequirePermissions('work:write')
  @Post(':id/comments')
  comment(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ): Promise<ActivityEvent> {
    return this.issues.comment(
      request.user.org,
      request.user.sub,
      id,
      dto.body,
    );
  }

  @RequirePermissions('work:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.issues.remove(request.user.org, id);
  }
}
