import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { WorkModule } from './work/work.module.js';
import { TeamModule } from './team/team.module.js';
import { CompanyModule } from './company/company.module.js';
import { DocsModule } from './docs/docs.module.js';
import { RequestsModule } from './requests/requests.module.js';

@Module({
  imports: [WorkModule, TeamModule, CompanyModule, DocsModule, RequestsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
