import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import type { ActivityEvent } from '@prisma/client';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { type ProjectSummary, ProjectsService } from './projects.service.js';

/** Scoped to the tenant in the token, like every other resource. */
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @RequirePermissions('work:read')
  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<ProjectSummary[]> {
    return this.projects.list(request.user.org);
  }

  @RequirePermissions('work:read')
  @Get(':id/activity')
  activity(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ActivityEvent[]> {
    return this.projects.activityFor(request.user.org, id);
  }
}
