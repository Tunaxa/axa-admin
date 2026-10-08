import { Controller, Get, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { type UserSummary, UsersService } from './users.service.js';

/** Scoped to the tenant in the token, like every other resource. */
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermissions('team:read')
  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<UserSummary[]> {
    return this.users.list(request.user.org);
  }
}
