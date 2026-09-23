import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module.js';
import { PagesController } from './pages.controller.js';
import { PagesService } from './pages.service.js';
import { Page, PageSchema } from './schemas/page.schema.js';

/**
 * Living documentation: architecture, conventions and developer onboarding.
 *
 * Pages and their content blocks live in MongoDB; see `schemas/`.
 */
@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Page.name, schema: PageSchema }]),
  ],
  controllers: [PagesController],
  providers: [PagesService],
})
export class DocsModule {}
