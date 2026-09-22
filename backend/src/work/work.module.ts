import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { WorkspacesController } from './workspaces.controller.js';
import { WorkspacesService } from './workspaces.service.js';

/**
 * Issues, projects, cycles and the board views that sit on top of them.
 *
 * Workspaces live here because they are what issues and projects hang off.
 */
@Module({
  imports: [AuthModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
})
export class WorkModule {}
