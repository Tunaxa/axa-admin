import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { BillingController } from './billing.controller.js';
import { StripeService } from './stripe.service.js';

/**
 * Payments.
 *
 * `StripeService` is exported so the Requests module can create a session the
 * moment a provisioning request is approved, without going through HTTP.
 */
@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [StripeService],
  exports: [StripeService],
})
export class BillingModule {}
