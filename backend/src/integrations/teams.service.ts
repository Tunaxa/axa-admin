import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  accountRequestCard,
  dailyDigestCard,
  issueAssignedCard,
  type AccountRequestNotification,
  type DailyDigestNotification,
  type IssueAssignedNotification,
  type TeamsMessage,
} from './teams-cards.js';

/** How long to wait on the webhook before giving up. */
const TIMEOUT_MS = 5000;

/**
 * Posts notifications to a Microsoft Teams incoming webhook.
 *
 * Two rules shape everything here.
 *
 * **A notification never fails the thing it is reporting.** Assigning an issue
 * has to succeed when Teams is down, slow, or misconfigured, so the public
 * methods return `void`, send in the background and swallow their own errors
 * into the log. A caller cannot accidentally await one, and cannot be broken
 * by one.
 *
 * **Without a webhook URL the integration is off**, not broken. Development
 * and CI have no webhook, and an API that refuses to boot without one would be
 * worse than one that is quiet.
 */
@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
  private readonly webhookUrl: string | undefined;

  constructor(config: ConfigService) {
    this.webhookUrl = config.get<string>('TEAMS_WEBHOOK_URL');

    if (!this.webhookUrl) {
      this.logger.log('TEAMS_WEBHOOK_URL is not set — notifications are off');
    }
  }

  get enabled(): boolean {
    return Boolean(this.webhookUrl);
  }

  notifyIssueAssigned(notification: IssueAssignedNotification): void {
    this.post('issue assigned', issueAssignedCard(notification));
  }

  notifyAccountRequestDecided(notification: AccountRequestNotification): void {
    this.post('account request decided', accountRequestCard(notification));
  }

  /** Returns the result, because a digest is triggered deliberately. */
  async sendDailyDigest(
    notification: DailyDigestNotification,
  ): Promise<{ sent: boolean; reason?: string }> {
    if (!this.webhookUrl) {
      return { sent: false, reason: 'TEAMS_WEBHOOK_URL is not set' };
    }

    try {
      await this.send(dailyDigestCard(notification));

      return { sent: true };
    } catch (cause: unknown) {
      const reason = cause instanceof Error ? cause.message : 'unknown error';
      this.logger.warn(`Daily digest not delivered: ${reason}`);

      return { sent: false, reason };
    }
  }

  /** Fire and forget: the promise is owned here so nothing can await it. */
  private post(label: string, message: TeamsMessage): void {
    if (!this.webhookUrl) {
      return;
    }

    void this.send(message).catch((cause: unknown) => {
      const reason = cause instanceof Error ? cause.message : 'unknown error';

      // The URL carries a secret, so it is never logged — only what happened.
      this.logger.warn(`Teams notification (${label}) failed: ${reason}`);
    });
  }

  private async send(message: TeamsMessage): Promise<void> {
    const response = await fetch(this.webhookUrl as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      // Without a deadline a hanging webhook holds a socket for as long as the
      // process lives.
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = (await response.text().catch(() => '')).slice(0, 200);

      throw new Error(`webhook answered ${response.status} ${body}`.trim());
    }
  }
}
