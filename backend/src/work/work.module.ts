import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { WorkspacesController } from './workspaces.controller.js';
import { WorkspacesService } from './workspaces.service.js';
import { IssuesController } from './issues.controller.js';
import { IssuesService } from './issues.service.js';

/**
 * Issues, projects, cycles and the board views that sit on top of them.
 *
 * Workspaces live here because they are what issues and projects hang off.
 */
@Module({
  imports: [AuthModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
 * Only issues are implemented so far; projects and cycles arrive with their own
 * tasks.
 */
@Module({
  imports: [AuthModule],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class WorkModule {}
