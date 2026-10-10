import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BillingModule } from './billing/billing.module.js';
import { CompanyModule } from './company/company.module.js';
import { DocsModule } from './docs/docs.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RequestsModule } from './requests/requests.module.js';
import { TeamModule } from './team/team.module.js';
import { WorkModule } from './work/work.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Docs pages live in MongoDB; everything else is in PostgreSQL. Resolved
    // asynchronously so the URL is read after ConfigModule has loaded `.env`,
    // not while this module is being decorated.
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URL');

        if (!uri) {
          throw new Error('MONGODB_URL is not set');
        }

        return { uri };
      },
    }),
    PrismaModule,
    AuthModule,
    BillingModule,
    WorkModule,
    TeamModule,
    CompanyModule,
    DocsModule,
    RequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
