import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { DailyReportsController } from './daily-reports.controller.js';
import { DailyReportsService } from './daily-reports.service.js';
import { RosterController } from './roster.controller.js';
import { RosterService } from './roster.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

/**
 * Team roster, roles, per-app ownership, capacity and daily reports.
 *
 * Holds daily reports and the user listing that pickers such as the assignee
 * dropdown read from.
 */
@Module({
  imports: [AuthModule, IntegrationsModule],
  controllers: [RosterController, UsersController, DailyReportsController],
  providers: [RosterService, UsersService, DailyReportsService],
})
export class TeamModule {}
