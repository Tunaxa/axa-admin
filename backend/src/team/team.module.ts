import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

/**
 * Team roster, roles, per-app ownership, capacity and daily reports.
 *
 * Only the roster listing exists so far, added because the issue detail panel
 * needs somewhere to read assignable people from.
 */
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class TeamModule {}
