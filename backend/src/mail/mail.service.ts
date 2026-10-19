import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

import {
  approvedEmail,
  needsMoreInfoEmail,
  rejectedEmail,
  type RenderedEmail,
  type RequestEmailContext,
} from './email-templates.js';

/** How long to wait on the mail server before giving up. */
const TIMEOUT_MS = 10_000;

export type RequestOutcome = 'approved' | 'rejected' | 'needs_more_info';

const TEMPLATES: Record<
  RequestOutcome,
  (context: RequestEmailContext) => RenderedEmail
> = {
  approved: approvedEmail,
  rejected: rejectedEmail,
  needs_more_info: needsMoreInfoEmail,
};

/**
 * Sends the emails a decision produces.
 *
 * **A decision is already recorded by the time this runs**, so sending is
 * fire-and-forget and swallows its own failures into the log — the same shape
 * as the Teams notifications, and for the same reason: a mail server that is
 * down must not undo an approval.
 *
 * Without `SMTP_HOST` the service is off rather than broken. Development and
 * CI have no mail server, and an API that refused to boot without one would be
 * worse than one that stays quiet about it.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter | null = null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');

    this.from =
      config.get<string>('MAIL_FROM') ?? 'AXA Admin <no-reply@axa.invalid>';

    if (!host) {
      this.logger.log('SMTP_HOST is not set — notification emails are off');

      return;
    }

    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASSWORD');

    this.transport = createTransport({
      host,
      port: Number(config.get<string>('SMTP_PORT') ?? 587),
      // Implicit TLS on 465, STARTTLS elsewhere. Overridable because a local
      // mail catcher speaks neither.
      secure: config.get<string>('SMTP_SECURE') === 'true',
      ...(user && pass ? { auth: { user, pass } } : {}),
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
  }

  get enabled(): boolean {
    return this.transport !== null;
  }

  /** Renders without sending — what the templates produce, for anyone asking. */
  render(outcome: RequestOutcome, context: RequestEmailContext): RenderedEmail {
    return TEMPLATES[outcome](context);
  }

  /** Fire and forget: the promise is owned here so nothing can await it. */
  notifyRequester(
    outcome: RequestOutcome,
    to: string,
    context: RequestEmailContext,
  ): void {
    if (!this.transport) {
      return;
    }

    const email = this.render(outcome, context);

    void this.transport
      .sendMail({
        from: this.from,
        to,
        subject: email.subject,
        text: email.text,
        html: email.html,
      })
      .then(() => {
        // The address is logged, the body is not: it carries whatever the
        // approver wrote about somebody.
        this.logger.log(`Sent the ${outcome} email to ${to}`);
      })
      .catch((cause: unknown) => {
        const reason = cause instanceof Error ? cause.message : 'unknown error';

        this.logger.warn(`Could not email ${to} about ${outcome}: ${reason}`);
      });
  }
}
