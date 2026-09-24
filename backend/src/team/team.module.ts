import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { RosterController } from './roster.controller.js';
import { RosterService } from './roster.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

/**
 * Team roster, roles, per-app ownership, capacity and daily reports.
 *
 * Holds the roster (team membership and roles) and the user listing that
 * pickers such as the assignee dropdown read from.
 */
@Module({
  imports: [AuthModule],
  controllers: [RosterController, UsersController],
  providers: [RosterService, UsersService],
})
export class TeamModule {}
