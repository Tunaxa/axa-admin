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
import type { ActivityEvent } from '@prisma/client';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import {
  CreateProjectDto,
  UpdateProjectDto,
} from './dto/update-project.dto.js';
import { type ProjectSummary, ProjectsService } from './projects.service.js';

/** Scoped to the tenant and the department in the token. */
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @RequirePermissions('work:read')
  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<ProjectSummary[]> {
    return this.projects.list(request.user.org, request.user.sub);
  }

  @RequirePermissions('projects:manage')
  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectSummary> {
    return this.projects.create(request.user.org, request.user.sub, dto);
  }

  @RequirePermissions('projects:manage')
  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectSummary> {
    return this.projects.update(request.user.org, request.user.sub, id, dto);
  }

  @RequirePermissions('projects:manage')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.projects.remove(request.user.org, request.user.sub, id);
  }

  @RequirePermissions('work:read')
  @Get(':id/activity')
  activity(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ActivityEvent[]> {
    return this.projects.activityFor(request.user.org, request.user.sub, id);
  }
}
