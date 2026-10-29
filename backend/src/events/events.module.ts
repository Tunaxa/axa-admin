import { Global, Module } from '@nestjs/common';

import { EventsService } from './events.service.js';

/**
 * Fan-out between instances.
 *
 * Global, like Prisma and mail: anything that changes something will
 * eventually want to say so, and importing this everywhere is noise.
 */
@Global()
@Module({
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
