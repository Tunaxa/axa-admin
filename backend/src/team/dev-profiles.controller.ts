import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import {
  type DevProfileView,
  DevProfilesService,
} from './dev-profiles.service.js';
import { ListDevProfilesQuery } from './dto/list-dev-profiles.query.js';
import { UpsertDevProfileDto } from './dto/upsert-dev-profile.dto.js';

/**
 * Developer profiles: what somebody works in, what they answer for, and where
 * to reach them.
 *
 * Addressed by team member id, because that is what a profile belongs to.
 */
@Controller('dev-profiles')
export class DevProfilesController {
  constructor(private readonly profiles: DevProfilesService) {}

  @RequirePermissions('team:read')
  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListDevProfilesQuery,
  ): Promise<DevProfileView[]> {
    return this.profiles.list(request.user.org, query);
  }

  @RequirePermissions('team:read')
  @Get(':teamMemberId')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('teamMemberId', ParseUUIDPipe) teamMemberId: string,
  ): Promise<DevProfileView> {
    return this.profiles.findOne(request.user.org, teamMemberId);
  }

  /**
   * Creates or replaces a profile.
   *
   * `team:read` at the route, and your own profile only in the service: the
   * guard decides per route, and "mine" is a per-record rule.
   */
  @RequirePermissions('team:read')
  @Put(':teamMemberId')
  upsert(
    @Req() request: AuthenticatedRequest,
    @Param('teamMemberId', ParseUUIDPipe) teamMemberId: string,
    @Body() dto: UpsertDevProfileDto,
  ): Promise<DevProfileView> {
    return this.profiles.upsert(
      request.user.org,
      request.user.sub,
      teamMemberId,
      dto,
    );
  }
}
