import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AccountRequest } from '@prisma/client';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { AccountRequestsService } from './account-requests.service.js';
import { ApproveRequestDto } from './dto/approve-request.dto.js';
import { CreateRequestDto } from './dto/create-request.dto.js';
import { DecideRequestDto } from './dto/decide-request.dto.js';
import { ListRequestsQuery } from './dto/list-requests.query.js';

/**
 * Account provisioning requests.
 *
 * Raising one is open to anyone on the team; deciding is not, because
 * approving creates a payment link.
 */
@Controller('requests')
export class AccountRequestsController {
  constructor(private readonly requests: AccountRequestsService) {}

  @RequirePermissions('requests:write')
  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateRequestDto,
  ): Promise<AccountRequest> {
    return this.requests.create(request.user.org, request.user.sub, dto);
  }

  @RequirePermissions('requests:read')
  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListRequestsQuery,
  ): Promise<AccountRequest[]> {
    return this.requests.list(request.user.org, query);
  }

  @RequirePermissions('requests:read')
  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AccountRequest> {
    return this.requests.findOne(request.user.org, id);
  }

  /** Approves, and answers with the checkout URL to send the customer to. */
  @RequirePermissions('requests:decide')
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRequestDto,
  ): Promise<AccountRequest> {
    return this.requests.approve(request.user.org, request.user.sub, id, dto);
  }

  @RequirePermissions('requests:decide')
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideRequestDto,
  ): Promise<AccountRequest> {
    return this.requests.reject(request.user.org, request.user.sub, id, dto);
  }

  @RequirePermissions('requests:decide')
  @Post(':id/needs-more-info')
  @HttpCode(HttpStatus.OK)
  needsMoreInfo(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideRequestDto,
  ): Promise<AccountRequest> {
    return this.requests.needsMoreInfo(
      request.user.org,
      request.user.sub,
      id,
      dto,
    );
  }
}
