import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard.js';
import { type UserSummary, UsersService } from './users.service.js';

/** Scoped to the tenant in the token, like every other resource. */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<UserSummary[]> {
    return this.users.list(request.user.org);
  }
}
