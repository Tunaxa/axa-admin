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
  UseGuards,
} from '@nestjs/common';

import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard.js';
import { CreateTeamMemberDto } from './dto/create-team-member.dto.js';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto.js';
import { type RosterEntry, RosterService } from './roster.service.js';

/**
 * The tenant comes from the verified token, never from the request, so every
 * route below is scoped to the caller's organization.
 */
@Controller('team-members')
@UseGuards(JwtAuthGuard)
export class RosterController {
  constructor(private readonly roster: RosterService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<RosterEntry[]> {
    return this.roster.list(request.user.org);
  }

  @Post()
  add(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTeamMemberDto,
  ): Promise<RosterEntry> {
    return this.roster.add(request.user.org, dto);
  }

  @Patch(':id')
  updateRole(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamMemberDto,
  ): Promise<RosterEntry> {
    return this.roster.updateRole(request.user.org, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.roster.remove(request.user.org, id);
  }
}
