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
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto.js';
import { type RosterEntry, RosterService } from './roster.service.js';

/**
 * The tenant and the department come from the verified token, never from the
 * request, so every route below is scoped to the caller's own slice.
 */
@Controller('team-members')
export class RosterController {
  constructor(private readonly roster: RosterService) {}

  @RequirePermissions('team:read')
  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<RosterEntry[]> {
    return this.roster.list(request.user.org, request.user.sub);
  }

  /**
   * One-shot: create the user and put them on a department's team.
   * The CEO picks the department; a manager adds to their own.
   */
  @RequirePermissions('team:manage')
  @Post('invite')
  invite(
    @Req() request: AuthenticatedRequest,
    @Body() dto: InviteMemberDto,
  ): Promise<RosterEntry> {
    return this.roster.invite(request.user.org, request.user.sub, dto);
  }

  @RequirePermissions('team:manage')
  @Patch(':id')
  updateRole(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamMemberDto,
  ): Promise<RosterEntry> {
    return this.roster.updateRole(request.user.org, request.user.sub, id, dto);
  }

  @RequirePermissions('team:manage')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.roster.remove(request.user.org, request.user.sub, id);
  }
}
