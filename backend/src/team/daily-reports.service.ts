import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import type { ListDailyReportsQuery } from './dto/list-daily-reports.query.js';
import type { SubmitDailyReportDto } from './dto/submit-daily-report.dto.js';

/** A report as the API returns it. */
export interface DailyReportView {
  id: string;
  reportDate: Date;
  shipped: string;
  blocked: string | null;
  next: string;
  author: { id: string; name: string; email: string };
  issues: { id: string; title: string }[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DailyReportsService {
  /** Shared shape so submit and list cannot drift apart. */
  private static readonly SELECT = {
    id: true,
    reportDate: true,
    shipped: true,
    blocked: true,
    next: true,
    createdAt: true,
    updatedAt: true,
    author: { select: { id: true, name: true, email: true } },
    issues: { select: { issue: { select: { id: true, title: true } } } },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stores the caller's report for one day.
   *
   * An upsert, because `(authorId, reportDate)` is unique: submitting twice
   * for the same day is an edit, not a second report.
   */
  async submit(
    organizationId: string,
    authorId: string,
    date: string,
    dto: SubmitDailyReportDto,
  ): Promise<DailyReportView> {
    const reportDate = parseReportDate(date);
    const issueIds = await this.assertIssuesInTenant(
      organizationId,
      dto.issueIds ?? [],
    );

    const fields = {
      shipped: dto.shipped,
      // An omitted blocker is null, not an empty string.
      blocked: dto.blocked ?? null,
      next: dto.next,
    };

    const report = await this.prisma.dailyReport.upsert({
      where: { authorId_reportDate: { authorId, reportDate } },
      create: {
        organizationId,
        authorId,
        reportDate,
        ...fields,
        issues: { create: issueIds.map((issueId) => ({ issueId })) },
      },
      update: {
        ...fields,
        // The links are replaced wholesale: the report says which issues it
        // refers to now, not which it has ever referred to.
        issues: {
          deleteMany: {},
          create: issueIds.map((issueId) => ({ issueId })),
        },
      },
      select: DailyReportsService.SELECT,
    });

    return toView(report);
  }

  async list(
    organizationId: string,
    query: ListDailyReportsQuery,
  ): Promise<DailyReportView[]> {
    const where: Prisma.DailyReportWhereInput = { organizationId };

    if (query.date) {
      where.reportDate = parseReportDate(query.date);
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    const reports = await this.prisma.dailyReport.findMany({
      where,
      select: DailyReportsService.SELECT,
      // Newest day first, then by author so a day's digest reads in a stable
      // order rather than by whoever submitted first.
      orderBy: [{ reportDate: 'desc' }, { author: { name: 'asc' } }],
    });

    return reports.map(toView);
  }

  /** Rejects issue ids that are not in the caller's tenant, and de-duplicates. */
  private async assertIssuesInTenant(
    organizationId: string,
    issueIds: string[],
  ): Promise<string[]> {
    const unique = [...new Set(issueIds)];

    if (unique.length === 0) {
      return [];
    }

    const found = await this.prisma.issue.findMany({
      where: { id: { in: unique }, organizationId },
      select: { id: true },
    });

    if (found.length !== unique.length) {
      throw new BadRequestException(
        'One or more issues were not found in this organization',
      );
    }

    return unique;
  }
}

/**
 * `YYYY-MM-DD` to a `Date` at UTC midnight.
 *
 * The column is a `date`, so the client decides which day its report covers —
 * deriving "today" on the server would give someone in Tunis a different day
 * from the server's clock.
 */
function parseReportDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException('date must be YYYY-MM-DD');
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('date is not a real calendar date');
  }

  // `new Date('2026-02-31')` rolls over to March; reject rather than silently move it.
  if (parsed.toISOString().slice(0, 10) !== date) {
    throw new BadRequestException('date is not a real calendar date');
  }

  return parsed;
}

type ReportRow = Prisma.DailyReportGetPayload<{
  select: (typeof DailyReportsService)['SELECT'];
}>;

function toView(report: ReportRow): DailyReportView {
  return {
    id: report.id,
    reportDate: report.reportDate,
    shipped: report.shipped,
    blocked: report.blocked,
    next: report.next,
    author: report.author,
    issues: report.issues.map((link) => link.issue),
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}
