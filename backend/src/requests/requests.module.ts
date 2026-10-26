import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { AccountRequestsController } from './account-requests.controller.js';
import { AccountRequestsService } from './account-requests.service.js';

/**
 * Account requests: the provisioning gateway across the customer-facing AXA
 * applications.
 *
 * Raised here, decided here, and paid for through Stripe — which is why this
 * module depends on billing rather than the other way round.
 */
@Module({
  imports: [AuthModule, BillingModule, IntegrationsModule],
  controllers: [AccountRequestsController],
  providers: [AccountRequestsService],
  exports: [AccountRequestsService],
})
export class RequestsModule {}
