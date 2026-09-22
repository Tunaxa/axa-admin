import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard.js';
import {
  type WorkspaceSummary,
  WorkspacesService,
} from './workspaces.service.js';

/** Scoped to the tenant in the token, like every other resource. */
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<WorkspaceSummary[]> {
    return this.workspaces.list(request.user.org);
  }
}
