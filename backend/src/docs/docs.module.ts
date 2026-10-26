import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PagesController } from './pages.controller.js';
import { PagesService } from './pages.service.js';

/**
 * Living documentation.
 *
 * Pages and their content blocks live in PostgreSQL alongside everything
 * else — see the `DocsPage` Prisma model.
 */
@Module({
  imports: [AuthModule],
  controllers: [PagesController],
  providers: [PagesService],
})
export class DocsModule {}
