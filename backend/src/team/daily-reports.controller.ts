import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import {
  type DailyReportView,
  DailyReportsService,
} from './daily-reports.service.js';
import { ListDailyReportsQuery } from './dto/list-daily-reports.query.js';
import { SubmitDailyReportDto } from './dto/submit-daily-report.dto.js';

/**
 * Daily reports.
 *
 * The author is always the caller — you submit your own report — and the
 * tenant comes from the verified token.
 */
@Controller('daily-reports')
export class DailyReportsController {
  constructor(private readonly reports: DailyReportsService) {}

  @RequirePermissions('reports:read')
  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListDailyReportsQuery,
  ): Promise<DailyReportView[]> {
    return this.reports.list(request.user.org, query);
  }

  /**
   * `PUT` rather than `POST`: there is one report per person per day, so
   * submitting again is an edit. Idempotent, and the date is explicit rather
   * than derived from the server's clock.
   */
  @RequirePermissions('reports:write')
  @Put(':date')
  submit(
    @Req() request: AuthenticatedRequest,
    @Param('date') date: string,
    @Body() dto: SubmitDailyReportDto,
  ): Promise<DailyReportView> {
    return this.reports.submit(request.user.org, request.user.sub, date, dto);
  }
}
