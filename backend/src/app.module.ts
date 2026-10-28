import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppUsageModule } from './app-usage/app-usage.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PermissionsGuard } from './auth/permissions.guard.js';
import { BillingModule } from './billing/billing.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { CompanyModule } from './company/company.module.js';
import { DepartmentsModule } from './departments/departments.module.js';
import { DocsModule } from './docs/docs.module.js';
import { EventsModule } from './events/events.module.js';
import { GithubModule } from './github/github.module.js';
import { MailModule } from './mail/mail.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { OrgChartModule } from './orgchart/orgchart.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RequestsModule } from './requests/requests.module.js';
import { TeamModule } from './team/team.module.js';
import { WorkModule } from './work/work.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    NotificationsModule,
    EventsModule,
    AuthModule,
    BillingModule,
    WorkModule,
    TeamModule,
    CompanyModule,
    DepartmentsModule,
    DocsModule,
    GithubModule,
    RequestsModule,
    CalendarModule,
    OrgChartModule,
    AppUsageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global, so a route cannot be added without a decision about who may call
    // it: anything that declares nothing is refused.
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
