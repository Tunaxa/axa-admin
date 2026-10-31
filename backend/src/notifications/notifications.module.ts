import { Global, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

/**
 * Notifications.
 *
 * `@Global` so any feature service can inject the publisher without having
 * to re-import the module, mirroring `PrismaModule`.
 */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
