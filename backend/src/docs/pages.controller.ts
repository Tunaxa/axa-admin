import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard.js';
import { CreatePageDto } from './dto/create-page.dto.js';
import { UpdatePageDto } from './dto/update-page.dto.js';
import { PagesService } from './pages.service.js';
import type { PageDocument } from './schemas/page.schema.js';
import { ParseObjectIdPipe } from './parse-object-id.pipe.js';

/**
 * The tenant comes from the verified token (`org`), never from the request, so
 * every route below is automatically scoped to the caller's organization.
 */
@Controller('docs/pages')
@UseGuards(JwtAuthGuard)
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePageDto,
  ): Promise<PageDocument> {
    return this.pages.create(request.user.org, request.user.sub, dto);
  }

  /** The tree, without page content. */
  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<PageDocument[]> {
    return this.pages.list(request.user.org);
  }

  /** One page, with its blocks. */
  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<PageDocument> {
    return this.pages.findOne(request.user.org, id);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePageDto,
  ): Promise<PageDocument> {
    return this.pages.update(request.user.org, request.user.sub, id, dto);
  }

  /**
   * Deletes the page and everything below it.
   *
   * Answers `200` with the number removed rather than the `204` the other
   * modules use: this call can take a whole section with it, and how much it
   * took is worth saying.
   */
  @Delete(':id')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<{ deleted: number }> {
    return this.pages.remove(request.user.org, id);
  }
}
