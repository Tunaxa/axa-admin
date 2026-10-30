import { Controller, Get, Req } from '@nestjs/common';
import type { AppUsageSnapshot } from '@prisma/client';

import { AuthenticatedOnly } from '../auth/permissions.decorator.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { AppUsageService } from './app-usage.service.js';

@Controller('app-usage')
export class AppUsageController {
  constructor(private readonly service: AppUsageService) {}

  @AuthenticatedOnly()
  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<AppUsageSnapshot[]> {
    return this.service.list(request.user.org);
  }
}
