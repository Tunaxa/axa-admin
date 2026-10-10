import { ConflictException, Injectable, Logger } from '@nestjs/common';
import type { GithubLink, GithubRepository } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import { parseIssueKeys } from '../work/issue-key.js';
import { type GithubDelivery, readDelivery } from './github-events.js';

/** What happened to a delivery, for the log and for the tests. */
export interface DeliveryOutcome {
  handled: boolean;
  reason?: string;
  linked: string[];
}

@Injectable()
export class GithubLinksService {
  private readonly logger = new Logger(GithubLinksService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- Connected repositories ---------------------------------------------

  listRepositories(organizationId: string): Promise<GithubRepository[]> {
    return this.prisma.githubRepository.findMany({
      where: { organizationId },
      orderBy: { fullName: 'asc' },
    });
  }

  async connectRepository(
    organizationId: string,
    fullName: string,
  ): Promise<GithubRepository> {
    try {
      return await this.prisma.githubRepository.create({
        data: { organizationId, fullName: fullName.toLowerCase() },
      });
    } catch {
      // Unique on `fullName` alone, so this also covers another tenant having
      // claimed it. The message says what the caller can act on without
      // confirming that someone else holds it.
      throw new ConflictException(`${fullName} is already connected`);
    }
  }

  async disconnectRepository(
    organizationId: string,
    fullName: string,
  ): Promise<{ disconnected: number }> {
    const result = await this.prisma.githubRepository.deleteMany({
      where: { organizationId, fullName: fullName.toLowerCase() },
    });

    return { disconnected: result.count };
  }

  // --- Reading what is linked ---------------------------------------------

  async linksForIssueKey(
    organizationId: string,
    issueKey: string,
  ): Promise<GithubLink[]> {
    const issue = await this.prisma.issue.findFirst({
      where: { organizationId, key: issueKey.toUpperCase() },
      select: { id: true },
    });

    if (!issue) {
      return [];
    }

    return this.prisma.githubLink.findMany({
      where: { issueId: issue.id },
      orderBy: [{ kind: 'asc' }, { number: 'asc' }],
    });
  }

  // --- The delivery itself -------------------------------------------------

  /**
   * Records what a delivery says, and returns what it did.
   *
   * Everything unusable comes back as `handled: false` with a reason rather
   * than as a failure: an unknown repository, an event this service does not
   * read, a pull request naming no issue. Answering GitHub with an error only
   * buys a retry of exactly the same delivery.
   */
  async handle(
    event: string,
    payload: GithubDelivery,
  ): Promise<DeliveryOutcome> {
    const fullName = payload.repository?.full_name?.toLowerCase();

    if (!fullName) {
      return {
        handled: false,
        reason: 'no repository in the payload',
        linked: [],
      };
    }

    const repository = await this.prisma.githubRepository.findUnique({
      where: { fullName },
      select: { organizationId: true },
    });

    if (!repository) {
      // Not an error. Anyone may point a webhook at this service; until a
      // tenant claims the repository there is nobody to record it for.
      return {
        handled: false,
        reason: `${fullName} is not connected`,
        linked: [],
      };
    }

    const object = readDelivery(event, payload);

    if (!object) {
      return {
        handled: false,
        reason: `nothing to read in a ${event} event`,
        linked: [],
      };
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: repository.organizationId },
      select: { issuePrefix: true },
    });

    const keys = organization
      ? parseIssueKeys(object.searchable, organization.issuePrefix)
      : [];

    if (keys.length === 0) {
      return {
        handled: false,
        reason: 'no issue key in the branch, title or body',
        linked: [],
      };
    }

    const issues = await this.prisma.issue.findMany({
      where: { organizationId: repository.organizationId, key: { in: keys } },
      select: { id: true, key: true },
    });

    if (issues.length === 0) {
      return {
        handled: false,
        reason: `no issue matches ${keys.join(', ')}`,
        linked: [],
      };
    }

    for (const issue of issues) {
      const identity = {
        repository: fullName,
        kind: object.kind,
        number: object.number,
        issueId: issue.id,
      };

      // Upsert, because GitHub sends an event per action on the same object
      // and redelivers on failure. A second `opened` must not make a second
      // row, and a later `closed` has to land on the first one.
      await this.prisma.githubLink.upsert({
        where: {
          repository_kind_number_issueId: identity,
        },
        create: {
          ...identity,
          organizationId: repository.organizationId,
          title: object.title,
          url: object.url,
          state: object.state,
          branch: object.branch,
          mergedAt: object.mergedAt,
        },
        update: {
          title: object.title,
          url: object.url,
          state: object.state,
          branch: object.branch,
          mergedAt: object.mergedAt,
        },
      });
    }

    const linked = issues.map((issue) => issue.key);

    this.logger.log(
      `${event} #${object.number} in ${fullName} -> ${linked.join(', ')} (${object.state})`,
    );

    return { handled: true, linked };
  }
}
