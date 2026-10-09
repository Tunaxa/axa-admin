import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Redirect,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import type { GithubLink, GithubRepository } from '@prisma/client';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { Public, RequirePermissions } from '../auth/permissions.decorator.js';
import { ConnectRepositoryDto } from './dto/connect-repository.dto.js';
import { GithubConfig } from './github.config.js';
import { GithubLinksService } from './github-links.service.js';
import type { GithubDelivery } from './github-events.js';
import type { DeliveryOutcome } from './github-links.service.js';
import { verifySignature } from './github-signature.js';
import {
  type GithubIdentity,
  GithubOauthService,
} from './github-oauth.service.js';

@Controller('github')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);

  constructor(
    private readonly oauth: GithubOauthService,
    private readonly github: GithubConfig,
    private readonly links: GithubLinksService,
  ) {}

  /** Sends the browser to GitHub to approve the application. */
  @Public()
  @Get('oauth/authorize')
  @Redirect()
  authorize(): { url: string } {
    return { url: this.oauth.authorizeUrl() };
  }

  /**
   * Where GitHub sends the browser back.
   *
   * Public because GitHub is redirecting a browser that may carry no session
   * of ours; the `state` parameter is what proves the flow is one we started.
   */
  @Public()
  @Get('oauth/callback')
  callback(
    @Query('code') code?: string,
    @Query('state') state?: string,
  ): Promise<GithubIdentity> {
    if (!code || !state) {
      throw new UnauthorizedException('Missing code or state');
    }

    return this.oauth.completeLogin(code, state);
  }

  /**
   * Where GitHub posts events.
   *
   * `@Public()` means "no bearer token", not "unauthenticated": the delivery
   * is authenticated by the HMAC signature below, which is the only
   * credential GitHub can present.
   *
   * This acknowledges and records; acting on the events is its own task. The
   * answer is deliberately fast and empty — GitHub times a delivery out after
   * ten seconds and retries, so work belongs behind a queue, not here.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.ACCEPTED)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
    @Headers('x-github-event') event?: string,
    @Headers('x-github-delivery') delivery?: string,
  ): Promise<{ received: true } & DeliveryOutcome> {
    const secret = this.github.webhookSecret;

    // No secret means every delivery is refused rather than trusted. An
    // unsigned webhook endpoint is an open door for anyone who learns the URL.
    if (!secret || !verifySignature(request.rawBody, signature, secret)) {
      this.logger.warn(
        `Rejected a GitHub delivery (${event ?? 'no event'}, ${delivery ?? 'no id'})`,
      );

      throw new UnauthorizedException('Invalid signature');
    }

    const outcome = await this.links.handle(
      event ?? '',
      (request.body ?? {}) as GithubDelivery,
    );

    if (!outcome.handled) {
      this.logger.log(
        `Ignored ${event ?? 'event'} ${delivery ?? '?'}: ${outcome.reason}`,
      );
    }

    // Always 202, even when nothing was recorded. An unconnected repository or
    // a branch naming no issue is not a failure GitHub can do anything about,
    // and answering with an error only buys a redelivery of the same thing.
    return { received: true, ...outcome };
  }

  // --- Connected repositories ---------------------------------------------

  @RequirePermissions('team:read')
  @Get('repositories')
  listRepositories(
    @Req() request: AuthenticatedRequest,
  ): Promise<GithubRepository[]> {
    return this.links.listRepositories(request.user.org);
  }

  /**
   * Claims a repository for this tenant.
   *
   * `team:manage`, because connecting a repository decides where its events
   * are recorded, and the claim is global — two tenants cannot hold the same
   * repository, since a delivery names only the repository.
   */
  @RequirePermissions('team:manage')
  @Post('repositories')
  connectRepository(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ConnectRepositoryDto,
  ): Promise<GithubRepository> {
    return this.links.connectRepository(request.user.org, dto.fullName);
  }

  @RequirePermissions('team:manage')
  @Delete('repositories/:owner/:name')
  disconnectRepository(
    @Req() request: AuthenticatedRequest,
    @Param('owner') owner: string,
    @Param('name') name: string,
  ): Promise<{ disconnected: number }> {
    return this.links.disconnectRepository(
      request.user.org,
      `${owner}/${name}`,
    );
  }

  // --- What is linked to an issue -----------------------------------------

  @RequirePermissions('work:read')
  @Get('links')
  linksForIssue(
    @Req() request: AuthenticatedRequest,
    @Query('issueKey') issueKey?: string,
  ): Promise<GithubLink[]> {
    return this.links.linksForIssueKey(request.user.org, issueKey ?? '');
  }
}
