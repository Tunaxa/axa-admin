import { Injectable } from '@nestjs/common';
import type { AppUsageSnapshot } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AppUsageService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string): Promise<AppUsageSnapshot[]> {
    return this.prisma.appUsageSnapshot.findMany({
      where: { organizationId },
      orderBy: [{ periodStart: 'desc' }],
      take: 500,
    });
  }
}
