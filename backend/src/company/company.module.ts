import { Module } from '@nestjs/common';

import { KpisController } from './kpis.controller.js';
import { KpisService } from './kpis.service.js';

/**
 * Company details, KPI dashboard, goals and reviews.
 *
 * Only the dashboard exists so far, and it reads other modules' records
 * rather than keeping any of its own.
 */
@Module({
  controllers: [KpisController],
  providers: [KpisService],
})
export class CompanyModule {}
