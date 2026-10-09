import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Everything the GitHub integration reads from the environment.
 *
 * The OAuth App itself is registered by hand in GitHub's settings — see the
 * README. This only holds what that registration gives back.
 */
@Injectable()
export class GithubConfig {
  private readonly logger = new Logger(GithubConfig.name);

  readonly clientId: string | undefined;
  readonly clientSecret: string | undefined;
  readonly webhookSecret: string | undefined;
  readonly callbackUrl: string | undefined;
  /** Overridable so the flow can be exercised against a stand-in. */
  readonly apiBase: string;
  readonly oauthBase: string;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('GITHUB_CLIENT_ID');
    this.clientSecret = config.get<string>('GITHUB_CLIENT_SECRET');
    this.webhookSecret = config.get<string>('GITHUB_WEBHOOK_SECRET');
    this.callbackUrl = config.get<string>('GITHUB_CALLBACK_URL');
    this.apiBase =
      config.get<string>('GITHUB_API_BASE') ?? 'https://api.github.com';
    this.oauthBase =
      config.get<string>('GITHUB_OAUTH_BASE') ?? 'https://github.com';

    if (!this.oauthConfigured) {
      this.logger.log('GitHub OAuth is not configured — /github/oauth is off');
    }

    if (!this.webhookSecret) {
      this.logger.warn(
        'GITHUB_WEBHOOK_SECRET is not set — the webhook will refuse every delivery',
      );
    }
  }

  get oauthConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.callbackUrl);
  }
}
