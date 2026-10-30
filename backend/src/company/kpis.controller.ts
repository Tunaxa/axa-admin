import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { KpiQuery } from './dto/kpi.query.js';
import { type PipelineKpis, KpisService } from './kpis.service.js';

/**
 * The company dashboard.
 *
 * `requests:read` rather than a permission of its own: this reports exactly
 * the records that permission already grants, and inventing a second one to
 * guard the same data would be ceremony.
 */
@Controller('company')
export class KpisController {
  constructor(private readonly kpis: KpisService) {}

  @RequirePermissions('requests:read')
  @Get('kpis')
  pipeline(
    @Req() request: AuthenticatedRequest,
    @Query() query: KpiQuery,
  ): Promise<PipelineKpis> {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('from must not be after to');
    }

    return this.kpis.pipeline(request.user.org, query);
  }
}
