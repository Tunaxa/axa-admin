import { Module } from '@nestjs/common';

import { OrgChartController } from './orgchart.controller.js';
import { OrgChartService } from './orgchart.service.js';

@Module({
  controllers: [OrgChartController],
  providers: [OrgChartService],
  exports: [OrgChartService],
})
export class OrgChartModule {}
