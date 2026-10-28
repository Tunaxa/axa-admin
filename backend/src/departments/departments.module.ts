import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DepartmentsController } from './departments.controller.js';
import { DepartmentsService } from './departments.service.js';

/** Departments: created by the CEO, run by a manager. */
@Module({
  imports: [AuthModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
