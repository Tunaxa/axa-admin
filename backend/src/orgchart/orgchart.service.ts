import { Injectable } from '@nestjs/common';
import type { OrgChart, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateOrgChartDto } from './dto/update-orgchart.dto.js';

@Injectable()
export class OrgChartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the tenant's single organization chart.
   * If it does not exist yet, creates it on the fly with empty nodes and edges.
   */
  async get(organizationId: string): Promise<OrgChart> {
    const existing = await this.prisma.orgChart.findUnique({
      where: { organizationId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.orgChart.create({
      data: {
        organizationId,
        name: 'Organigramme',
        data: { nodes: [], edges: [] },
      },
    });
  }

  /**
   * Updates the tenant's organization chart data.
   */
  async update(
    organizationId: string,
    dto: UpdateOrgChartDto,
  ): Promise<OrgChart> {
    return this.prisma.orgChart.upsert({
      where: { organizationId },
      update: {
        data: dto.data as Prisma.InputJsonValue,
        ...(dto.name ? { name: dto.name } : {}),
      },
      create: {
        organizationId,
        name: dto.name ?? 'Organigramme',
        data: dto.data as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Resets/deletes the tenant's organization chart.
   */
  async remove(organizationId: string): Promise<{ deleted: boolean }> {
    await this.prisma.orgChart.deleteMany({
      where: { organizationId },
    });
    return { deleted: true };
  }
}
