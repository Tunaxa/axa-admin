import { Controller, Get, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import {
  type WorkspaceSummary,
  WorkspacesService,
} from './workspaces.service.js';

/** Scoped to the tenant in the token, like every other resource. */
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @RequirePermissions('work:read')
  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<WorkspaceSummary[]> {
    return this.workspaces.list(request.user.org);
  }
}
