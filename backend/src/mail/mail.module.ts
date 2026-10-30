import { Global, Module } from '@nestjs/common';

import { MailService } from './mail.service.js';

/**
 * Outbound email.
 *
 * Global, like Prisma: more than one module will eventually have something to
 * tell somebody, and importing a mail module everywhere is noise.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
