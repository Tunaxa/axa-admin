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
  UseGuards,
} from '@nestjs/common';
import type { Issue } from '@prisma/client';

import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard.js';
import { CreateIssueDto } from './dto/create-issue.dto.js';
import { ListIssuesQuery } from './dto/list-issues.query.js';
import { UpdateIssueDto } from './dto/update-issue.dto.js';
import { IssuesService } from './issues.service.js';

/**
 * The tenant comes from the verified token (`org`), never from the request, so
 * every route below is automatically scoped to the caller's organization.
 */
@Controller('issues')
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateIssueDto,
  ): Promise<Issue> {
    return this.issues.create(request.user.org, dto);
  }

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListIssuesQuery,
  ): Promise<Issue[]> {
    return this.issues.list(request.user.org, query);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIssueDto,
  ): Promise<Issue> {
    return this.issues.update(request.user.org, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.issues.remove(request.user.org, id);
  }
}
