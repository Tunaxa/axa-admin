import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CalendarController } from './calendar.controller.js';
import { CalendarService } from './calendar.service.js';

/**
 * The shared company calendar: events scoped to the caller's tenant,
 * created and edited from the frontend's calendar view.
 */
@Module({
  imports: [AuthModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
