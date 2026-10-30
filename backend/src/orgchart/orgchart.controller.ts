import { Body, Controller, Delete, Get, Put, Req } from '@nestjs/common';
import type { OrgChart } from '@prisma/client';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { UpdateOrgChartDto } from './dto/update-orgchart.dto.js';
import { OrgChartService } from './orgchart.service.js';

@Controller('orgchart')
export class OrgChartController {
  constructor(private readonly orgChart: OrgChartService) {}

  @RequirePermissions('orgchart:read')
  @Get()
  get(@Req() request: AuthenticatedRequest): Promise<OrgChart> {
    return this.orgChart.get(request.user.org);
  }

  @RequirePermissions('orgchart:write')
  @Put()
  update(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateOrgChartDto,
  ): Promise<OrgChart> {
    return this.orgChart.update(request.user.org, dto);
  }

  @RequirePermissions('orgchart:delete')
  @Delete()
  remove(@Req() request: AuthenticatedRequest): Promise<{ deleted: boolean }> {
    return this.orgChart.remove(request.user.org);
  }
}
