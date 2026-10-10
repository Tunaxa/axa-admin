import { Module } from '@nestjs/common';

import { TeamsService } from './teams.service.js';

/**
 * Outbound integrations with the tools the team already works in.
 *
 * Exported rather than used here: the modules that own the events — work for
 * assignments, team for the daily digest — decide what is worth announcing.
 */
@Module({
  providers: [TeamsService],
  exports: [TeamsService],
})
export class IntegrationsModule {}
