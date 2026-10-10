import { Module } from '@nestjs/common';

import { GithubConfig } from './github.config.js';
import { GithubController } from './github.controller.js';
import { GithubOauthService } from './github-oauth.service.js';

/**
 * GitHub: the OAuth flow, and the endpoint GitHub posts events to.
 *
 * Its own module rather than a corner of `integrations`, so that it can grow
 * an event handler without the Teams notifier having an opinion about it.
 */
@Module({
  controllers: [GithubController],
  providers: [GithubConfig, GithubOauthService],
  exports: [GithubConfig],
})
export class GithubModule {}
