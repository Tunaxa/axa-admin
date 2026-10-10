import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Redirect,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { Public } from '../auth/permissions.decorator.js';
import { GithubConfig } from './github.config.js';
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
  receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
    @Headers('x-github-event') event?: string,
    @Headers('x-github-delivery') delivery?: string,
  ): { received: true } {
    const secret = this.github.webhookSecret;

    // No secret means every delivery is refused rather than trusted. An
    // unsigned webhook endpoint is an open door for anyone who learns the URL.
    if (!secret || !verifySignature(request.rawBody, signature, secret)) {
      this.logger.warn(
        `Rejected a GitHub delivery (${event ?? 'no event'}, ${delivery ?? 'no id'})`,
      );

      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.log(`GitHub ${event ?? 'event'} delivery ${delivery ?? '?'}`);

    return { received: true };
  }
}
