import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AppUsageController } from './app-usage.controller.js';
import { AppUsageService } from './app-usage.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AppUsageController],
  providers: [AppUsageService],
})
export class AppUsageModule {}
