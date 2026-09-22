import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CompanyModule } from './company/company.module.js';
import { DocsModule } from './docs/docs.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RequestsModule } from './requests/requests.module.js';
import { TeamModule } from './team/team.module.js';
import { WorkModule } from './work/work.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
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
