import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard.js';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';
import { type CheckoutSession, StripeService } from './stripe.service.js';

/**
 * Billing.
 *
 * The tenant and the person acting come from the verified token, and both are
 * written onto the session's metadata so a payment can be attributed later.
 */
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly stripe: StripeService) {}

  /**
   * Creates a Stripe Checkout Session and answers with the URL to send the
   * customer to.
   *
   * Intended to be called when a provisioning request is approved. That caller
   * does not exist yet — `RequestsModule` is still an empty scaffold — so the
   * route takes a `referenceId` for whatever is being approved and is ready
   * for it.
   */
  @RequirePermissions('billing:manage')
  @Post('checkout-sessions')
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSession> {
    return this.stripe.createCheckoutSession(
      request.user.org,
      request.user.sub,
      dto,
    );
  }
}
