import { Injectable } from '@nestjs/common';
import { AccountRequestStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import type { KpiQuery } from './dto/kpi.query.js';

/** A metric that cannot be measured yet, and why. */
export interface Unavailable {
  value: null;
  unavailable: string;
}

export interface PipelineKpis {
  window: { from: string; to: string };
  requests: {
    raised: number;
    open: number;
    byStatus: Record<string, number>;
    byApp: Record<string, number>;
  };
  decisions: {
    decided: number;
    approved: number;
    rejected: number;
    sentBack: number;
    /** Approved as a share of approved plus rejected. Null when none were. */
    approvalRate: number | null;
    hoursToDecision: {
      median: number | null;
      p90: number | null;
    };
  };
  payments: {
    checkoutLinksIssued: number;
    paid: Unavailable;
    conversionRate: Unavailable;
  };
}

/** How far back the window reaches when the caller does not say. */
const DEFAULT_DAYS = 30;

/**
 * Why `payments.paid` has no number.
 *
 * Said once, here, and carried into the response rather than left for the
 * reader to work out from a zero.
 */
const PAYMENT_UNAVAILABLE =
  'nothing confirms payment yet: Stripe reports a completed checkout over a webhook, and that endpoint does not exist';

@Injectable()
export class KpisService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The provisioning pipeline, computed.
   *
   * Everything here is derived from the requests themselves. Nothing is
   * entered by hand, and nothing is stored — which means a correction to a
   * request corrects the numbers, instead of leaving a snapshot disagreeing
   * with the records it was taken from.
   */
  async pipeline(
    organizationId: string,
    query: KpiQuery,
  ): Promise<PipelineKpis> {
    const { from, to } = resolveWindow(query);
    const raisedIn = { organizationId, createdAt: { gte: from, lt: to } };

    const [byStatus, byApp, decisionCounts, durations] = await Promise.all([
      this.prisma.accountRequest.groupBy({
        by: ['status'],
        where: raisedIn,
        _count: { _all: true },
      }),
      this.prisma.accountRequest.groupBy({
        by: ['app'],
        where: raisedIn,
        _count: { _all: true },
      }),
      // Decisions are counted by when they were *made*, not by when the
      // request was raised: "how many did we decide last week" is a different
      // question from "of last week's requests, how many are decided", and a
      // dashboard that silently answers the second is misleading.
      this.prisma.accountRequest.groupBy({
        by: ['status'],
        where: { organizationId, decidedAt: { gte: from, lt: to } },
        _count: { _all: true },
      }),
      this.decisionDurations(organizationId, from, to),
    ]);

    const statusCounts = countsByKey(byStatus, 'status');
    const decidedCounts = countsByKey(decisionCounts, 'status');

    const approved = decidedCounts[AccountRequestStatus.approved] ?? 0;
    const rejected = decidedCounts[AccountRequestStatus.rejected] ?? 0;
    const sentBack = decidedCounts[AccountRequestStatus.needs_more_info] ?? 0;
    const settled = approved + rejected;

    const checkoutLinksIssued = await this.prisma.accountRequest.count({
      where: {
        organizationId,
        decidedAt: { gte: from, lt: to },
        checkoutUrl: { not: null },
      },
    });

    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      requests: {
        raised: sum(statusCounts),
        open:
          (statusCounts[AccountRequestStatus.pending] ?? 0) +
          (statusCounts[AccountRequestStatus.needs_more_info] ?? 0),
        byStatus: statusCounts,
        byApp: countsByKey(byApp, 'app'),
      },
      decisions: {
        decided: approved + rejected + sentBack,
        approved,
        rejected,
        sentBack,
        // Sending a request back is not a verdict, so it is kept out of the
        // rate. Null rather than zero when nothing was settled: "we approved
        // none of nothing" is not a 0% approval rate.
        approvalRate: settled === 0 ? null : round(approved / settled, 3),
        hoursToDecision: durations,
      },
      payments: {
        checkoutLinksIssued,
        paid: { value: null, unavailable: PAYMENT_UNAVAILABLE },
        conversionRate: { value: null, unavailable: PAYMENT_UNAVAILABLE },
      },
    };
  }

  /**
   * How long decisions took, in hours.
   *
   * A median and a p90 rather than a mean: one request that sat over a
   * holiday drags an average somewhere nobody experienced, and the question
   * being asked is "how long does this usually take".
   *
   * Raw SQL because percentiles are not something Prisma expresses, and the
   * tenant and the window are bound as parameters rather than interpolated.
   */
  private async decisionDurations(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{ median: number | null; p90: number | null }> {
    const rows = await this.prisma.$queryRaw<
      { median: number | null; p90: number | null }[]
    >(Prisma.sql`
      SELECT
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM ("decidedAt" - "createdAt")) / 3600
        )::float8 AS median,
        percentile_cont(0.9) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM ("decidedAt" - "createdAt")) / 3600
        )::float8 AS p90
      FROM account_requests
      WHERE "organizationId" = ${organizationId}::uuid
        AND "decidedAt" IS NOT NULL
        AND "decidedAt" >= ${from}
        AND "decidedAt" < ${to}
    `);

    const row = rows[0];

    return {
      median: row?.median == null ? null : round(row.median, 2),
      p90: row?.p90 == null ? null : round(row.p90, 2),
    };
  }
}

function resolveWindow(query: KpiQuery): { from: Date; to: Date } {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000);

  return { from, to };
}

function countsByKey<K extends string>(
  rows: ({ _count: { _all: number } } & Record<K, string>)[],
  key: K,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const row of rows) {
    counts[row[key]] = row._count._all;
  }

  return counts;
}

function sum(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, n) => total + n, 0);
}

function round(value: number, places: number): number {
  const factor = 10 ** places;

  return Math.round(value * factor) / factor;
}
