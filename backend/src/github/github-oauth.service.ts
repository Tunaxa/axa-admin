import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { GithubConfig } from './github.config.js';

/** How long an authorization attempt stays valid. */
const STATE_TTL_MS = 10 * 60 * 1000;

const TIMEOUT_MS = 5000;

export interface GithubIdentity {
  login: string;
  name: string | null;
  githubId: number;
}

@Injectable()
export class GithubOauthService {
  private readonly logger = new Logger(GithubOauthService.name);
  private readonly stateSecret: string;

  constructor(
    private readonly github: GithubConfig,
    config: ConfigService,
  ) {
    // Signing `state` rather than storing it: the alternative is a session or
    // Redis, and neither exists yet. A signed, expiring nonce gives the same
    // CSRF protection with nothing to keep.
    const secret = config.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }

    this.stateSecret = `github-oauth:${secret}`;
  }

  /** Where to send the browser to start the flow. */
  authorizeUrl(): string {
    this.assertConfigured();

    const params = new URLSearchParams({
      client_id: this.github.clientId as string,
      redirect_uri: this.github.callbackUrl as string,
      // Only what the integration needs: read access to issues and pull
      // requests. `repo` would also grant write access to code.
      scope: 'read:user repo:status',
      state: this.issueState(),
      allow_signup: 'false',
    });

    return `${this.github.oauthBase}/login/oauth/authorize?${params.toString()}`;
  }

  /** Exchanges the code GitHub sent back for a token, and says who it is. */
  async completeLogin(code: string, state: string): Promise<GithubIdentity> {
    this.assertConfigured();

    if (!this.verifyState(state)) {
      // The state did not come from us, or it is too old. Either way this is
      // not a flow we started.
      throw new UnauthorizedException('Invalid or expired state');
    }

    const token = await this.exchangeCode(code);

    return this.identify(token);
  }

  private async exchangeCode(code: string): Promise<string> {
    const response = await fetch(
      `${this.github.oauthBase}/login/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.github.clientId,
          client_secret: this.github.clientSecret,
          code,
          redirect_uri: this.github.callbackUrl,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      this.logger.error(`GitHub refused the code exchange: ${response.status}`);

      throw new ServiceUnavailableException('GitHub did not answer');
    }

    const payload = (await response.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!payload.access_token) {
      // GitHub answers 200 with an error body for a used or wrong code, so
      // the status alone is not enough to tell success from failure.
      this.logger.warn(`Code exchange failed: ${payload.error ?? 'no token'}`);

      throw new BadRequestException(
        payload.error_description ?? 'GitHub rejected the authorization code',
      );
    }

    return payload.access_token;
  }

  private async identify(token: string): Promise<GithubIdentity> {
    const response = await fetch(`${this.github.apiBase}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Could not read the GitHub account',
      );
    }

    const user = (await response.json()) as {
      login: string;
      name: string | null;
      id: number;
    };

    return { login: user.login, name: user.name ?? null, githubId: user.id };
  }

  /** `<nonce>.<expiry>.<signature>` — unguessable, self-expiring, unstored. */
  private issueState(): string {
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = Date.now() + STATE_TTL_MS;
    const body = `${nonce}.${expiresAt}`;

    return `${body}.${this.sign(body)}`;
  }

  private verifyState(state: string): boolean {
    const parts = state.split('.');

    if (parts.length !== 3) {
      return false;
    }

    const [nonce, expiresAt, signature] = parts;
    const expected = this.sign(`${nonce}.${expiresAt}`);
    const received = Buffer.from(signature);
    const computed = Buffer.from(expected);

    if (received.length !== computed.length) {
      return false;
    }

    if (!timingSafeEqual(received, computed)) {
      return false;
    }

    return Number(expiresAt) > Date.now();
  }

  private sign(body: string): string {
    return createHmac('sha256', this.stateSecret).update(body).digest('hex');
  }

  private assertConfigured(): void {
    if (!this.github.oauthConfigured) {
      throw new ServiceUnavailableException('GitHub OAuth is not configured');
    }
  }
}
