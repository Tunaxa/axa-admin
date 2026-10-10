import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import type { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';

/**
 * How long to wait on Stripe for one attempt.
 *
 * With `maxNetworkRetries: 1` the worst case a caller can wait is two of
 * these, so the ceiling is about ten seconds. Creating a session normally
 * takes well under one; somebody waiting on an approval should not be made to
 * sit through a minute of someone else's outage.
 */
const TIMEOUT_MS = 5000;

/** What the caller gets back: enough to send someone to the payment page. */
export interface CheckoutSession {
  id: string;
  url: string;
  mode: string;
  expiresAt: string | null;
}

/**
 * Creates Stripe Checkout Sessions.
 *
 * **No card details ever reach this service.** Checkout is hosted by Stripe:
 * this creates a session and hands back a URL, the customer enters their card
 * on Stripe's page, and nothing in this codebase is ever in scope for it.
 *
 * **Unconfigured is an error here, not silence.** The Teams integration stays
 * quiet without a webhook because a missed notification costs nothing; a
 * missing checkout session means somebody cannot pay, so it answers 503 rather
 * than pretending.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe | null = null;
  private readonly successUrl: string | undefined;
  private readonly cancelUrl: string | undefined;

  constructor(config: ConfigService) {
    const secretKey = config.get<string>('STRIPE_SECRET_KEY');
    this.successUrl = config.get<string>('STRIPE_SUCCESS_URL');
    this.cancelUrl = config.get<string>('STRIPE_CANCEL_URL');

    if (!secretKey) {
      this.logger.log('STRIPE_SECRET_KEY is not set — billing is unavailable');

      return;
    }

    // Host, port and protocol are overridable so the integration can be
    // exercised against a stand-in. Unset, the SDK talks to api.stripe.com.
    const host = config.get<string>('STRIPE_API_HOST');

    this.stripe = new Stripe(secretKey, {
      timeout: TIMEOUT_MS,
      // Stripe retries are safe here because every create carries an
      // idempotency key, so a retried request cannot make a second session.
      maxNetworkRetries: 1,
      ...(host
        ? {
            host,
            port: config.get<string>('STRIPE_API_PORT'),
            protocol: 'http' as const,
          }
        : {}),
    });
  }

  get enabled(): boolean {
    return this.stripe !== null;
  }

  async createCheckoutSession(
    organizationId: string,
    actorId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSession> {
    if (!this.stripe || !this.successUrl || !this.cancelUrl) {
      throw new ServiceUnavailableException('Billing is not configured');
    }

    try {
      const session = await this.stripe.checkout.sessions.create(
        {
          mode: dto.mode ?? 'subscription',
          line_items: [{ price: dto.priceId, quantity: dto.quantity ?? 1 }],
          customer_email: dto.customerEmail,
          // The return URLs come from configuration, never from the caller.
          // Taking them from a request would turn this into an open redirect
          // that Stripe itself sends people through.
          success_url: this.successUrl,
          cancel_url: this.cancelUrl,
          client_reference_id: dto.referenceId,
          // Carried so that whatever handles the payment webhook later can
          // attribute it without guessing.
          metadata: {
            organizationId,
            app: dto.app,
            referenceId: dto.referenceId,
            approvedBy: actorId,
          },
        },
        {
          // Approving the same thing twice returns the first session rather
          // than creating a second one someone could also pay.
          idempotencyKey: `axa-admin:checkout:${organizationId}:${dto.referenceId}`,
        },
      );

      if (!session.url) {
        throw new BadGatewayException('Stripe returned a session with no URL');
      }

      return {
        id: session.id,
        url: session.url,
        mode: session.mode ?? dto.mode ?? 'subscription',
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
      };
    } catch (cause: unknown) {
      throw this.translate(cause);
    }
  }

  /**
   * Turns a Stripe failure into the right answer for the caller.
   *
   * The distinction that matters: a bad price is the caller's problem and gets
   * a 400, while a rejected API key is ours and must not be reported as though
   * the request were wrong. Stripe's own message is passed on only for the
   * former — our configuration problems are logged, not published.
   */
  private translate(cause: unknown): Error {
    if (cause instanceof BadGatewayException) {
      return cause;
    }

    if (!(cause instanceof Stripe.errors.StripeError)) {
      this.logger.error(
        `Checkout session failed: ${cause instanceof Error ? cause.message : 'unknown error'}`,
      );

      return new BadGatewayException('Could not reach the payment provider');
    }

    switch (cause.type) {
      case 'StripeInvalidRequestError':
        return new BadRequestException(cause.message);

      case 'StripeConnectionError':
        this.logger.error(`Stripe unreachable: ${cause.message}`);

        return new GatewayTimeoutException('The payment provider timed out');

      case 'StripeAuthenticationError':
      case 'StripePermissionError':
        // Never echoed to the caller: it says what is wrong with our key.
        this.logger.error(`Stripe rejected our credentials: ${cause.message}`);

        return new ServiceUnavailableException('Billing is not configured');

      case 'StripeRateLimitError':
        this.logger.warn('Stripe rate limited this service');

        return new ServiceUnavailableException(
          'The payment provider is busy, try again',
        );

      default:
        this.logger.error(`Stripe error (${cause.type}): ${cause.message}`);

        return new BadGatewayException('The payment provider failed');
    }
  }
}
