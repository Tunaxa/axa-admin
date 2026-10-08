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
  Req,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { CreateTeamMemberDto } from './dto/create-team-member.dto.js';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto.js';
import { type RosterEntry, RosterService } from './roster.service.js';

/**
 * The tenant comes from the verified token, never from the request, so every
 * route below is scoped to the caller's organization.
 */
@Controller('team-members')
export class RosterController {
  constructor(private readonly roster: RosterService) {}

  @RequirePermissions('team:read')
  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<RosterEntry[]> {
    return this.roster.list(request.user.org);
  }

  @RequirePermissions('team:manage')
  @Post()
  add(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTeamMemberDto,
  ): Promise<RosterEntry> {
    return this.roster.add(request.user.org, dto);
  }

  @RequirePermissions('team:manage')
  @Patch(':id')
  updateRole(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamMemberDto,
  ): Promise<RosterEntry> {
    return this.roster.updateRole(request.user.org, id, dto);
  }

  @RequirePermissions('team:manage')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.roster.remove(request.user.org, id);
  }
}
