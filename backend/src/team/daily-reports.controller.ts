import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard.js';
import { TeamsService } from '../integrations/teams.service.js';
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
@UseGuards(JwtAuthGuard)
export class DailyReportsController {
  constructor(
    private readonly reports: DailyReportsService,
    private readonly teams: TeamsService,
  ) {}

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
  /**
   * Posts the day's digest to Teams.
   *
   * Triggered rather than scheduled: this service has no scheduler, and adding
   * one is a deployment concern with its own task. A cron calling this route
   * once an evening is the intended use, and in the meantime a team leader can
   * ask for it.
   *
   * Answers what happened — `{ sent: false, reason }` when there is no webhook
   * configured or the call failed — because unlike the assignment
   * notifications, somebody is waiting on this one.
   */
  @Post(':date/digest')
  @HttpCode(HttpStatus.OK)
  async sendDigest(
    @Req() request: AuthenticatedRequest,
    @Param('date') date: string,
  ): Promise<{ sent: boolean; reason?: string; reports: number }> {
    const reports = await this.reports.list(request.user.org, { date });

    const result = await this.teams.sendDailyDigest({
      date,
      entries: reports.map((report) => ({
        authorName: report.author.name,
        shipped: report.shipped,
        blocked: report.blocked,
        next: report.next,
      })),
    });

    return { ...result, reports: reports.length };
  }

  @Put(':date')
  submit(
    @Req() request: AuthenticatedRequest,
    @Param('date') date: string,
    @Body() dto: SubmitDailyReportDto,
  ): Promise<DailyReportView> {
    return this.reports.submit(request.user.org, request.user.sub, date, dto);
  }
}
