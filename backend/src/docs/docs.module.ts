import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Page, PageSchema } from './schemas/page.schema.js';

/**
 * Living documentation: architecture, conventions and developer onboarding.
 *
 * Schema only so far. The page tree and its content blocks are modelled; the
 * controllers and services that read and write them arrive with their own
 * tasks.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Page.name, schema: PageSchema }]),
  ],
})
export class DocsModule {}
