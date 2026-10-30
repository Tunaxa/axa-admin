import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/** Everything this service announces, and what each one carries. */
export interface DomainEvents {
  'request.decided': {
    organizationId: string;
    requestId: string;
    app: string;
    status: string;
    requesterEmail: string;
  };
  'issue.assigned': {
    organizationId: string;
    issueId: string;
    assigneeId: string;
  };
}

export type DomainEventName = keyof DomainEvents;

/** What a subscriber is handed: the payload, and which tenant it belongs to. */
export type Handler<N extends DomainEventName> = (
  payload: DomainEvents[N],
) => void;

/**
 * The channel an event is published on.
 *
 * Namespaced, so this Redis can be shared with another service without the
 * two interfering — and per tenant, so a subscriber that only cares about one
 * organization does not have to receive and discard everybody else's.
 */
function channelFor(name: DomainEventName, organizationId: string): string {
  return `axa-admin:${organizationId}:${name}`;
}

/**
 * Publish/subscribe over Redis.
 *
 * **Two connections, not one.** A Redis connection in subscriber mode accepts
 * almost no other command, so publishing down the same socket fails. This is
 * the classic way to get Pub/Sub wrong, and it fails only once something
 * actually subscribes.
 *
 * **This is fan-out, not a queue.** Redis Pub/Sub delivers to whoever is
 * listening at the moment of publication and to nobody else: a subscriber
 * that is restarting misses whatever is sent meanwhile, and nothing is
 * retained, retried or acknowledged. That is the right shape for telling
 * other instances what just happened, and the wrong shape for work that has
 * to happen. See the README.
 *
 * **Without `REDIS_URL` the service is off, not broken.** Publishing becomes a
 * no-op; development and CI do not need a Redis to run the API.
 */
@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private readonly url: string | undefined;

  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  /** Channel → the handlers waiting on it. */
  private readonly handlers = new Map<string, Set<(raw: string) => void>>();

  constructor(config: ConfigService) {
    this.url = config.get<string>('REDIS_URL');
  }

  get enabled(): boolean {
    return Boolean(this.url);
  }

  onModuleInit(): void {
    if (!this.url) {
      this.logger.log('REDIS_URL is not set — event fan-out is off');

      return;
    }

    this.publisher = this.connect('publisher');
    this.subscriber = this.connect('subscriber');

    this.subscriber.on('message', (channel: string, raw: string) => {
      for (const handler of this.handlers.get(channel) ?? []) {
        try {
          handler(raw);
        } catch (cause: unknown) {
          // One bad handler must not stop the others on the same channel.
          const reason =
            cause instanceof Error ? cause.message : 'unknown error';

          this.logger.warn(`A handler for ${channel} threw: ${reason}`);
        }
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    // `quit` rather than `disconnect`: it waits for replies in flight, so a
    // restart does not drop a publish that was already on the wire.
    await Promise.all([this.publisher?.quit(), this.subscriber?.quit()]);
  }

  /**
   * Announces that something happened.
   *
   * Returns nothing and never throws. A publish that fails is logged: the
   * thing being announced has already happened, and no amount of Redis being
   * down should undo it.
   */
  publish<N extends DomainEventName>(
    name: N,
    organizationId: string,
    payload: DomainEvents[N],
  ): void {
    if (!this.publisher) {
      return;
    }

    const channel = channelFor(name, organizationId);

    void this.publisher
      .publish(channel, JSON.stringify(payload))
      .catch((cause: unknown) => {
        const reason = cause instanceof Error ? cause.message : 'unknown error';

        this.logger.warn(`Could not publish ${name}: ${reason}`);
      });
  }

  /** Listens for one event in one tenant. Returns how to stop listening. */
  async subscribe<N extends DomainEventName>(
    name: N,
    organizationId: string,
    handler: Handler<N>,
  ): Promise<() => Promise<void>> {
    if (!this.subscriber) {
      return async () => {};
    }

    const channel = channelFor(name, organizationId);
    const wrapped = (raw: string) =>
      handler(JSON.parse(raw) as DomainEvents[N]);

    const existing = this.handlers.get(channel);

    if (existing) {
      existing.add(wrapped);
    } else {
      this.handlers.set(channel, new Set([wrapped]));
      await this.subscriber.subscribe(channel);
    }

    return async () => {
      const handlers = this.handlers.get(channel);

      handlers?.delete(wrapped);

      // Only leave the channel once nobody is left on it, or one listener
      // going away would silence the others.
      if (handlers && handlers.size === 0) {
        this.handlers.delete(channel);
        await this.subscriber?.unsubscribe(channel);
      }
    };
  }

  private connect(role: string): Redis {
    const client = new Redis(this.url as string, {
      // Give up rather than reconnecting for ever: a wrong URL should be
      // visible in the log, not hidden behind an infinite backoff.
      retryStrategy: (times) =>
        times > 5 ? null : Math.min(times * 200, 2000),
      maxRetriesPerRequest: 2,
      lazyConnect: false,
    });

    client.on('error', (cause: Error) => {
      // Logged once per failure rather than thrown: the API runs without
      // Redis, it simply stops telling anyone.
      this.logger.warn(`Redis ${role} error: ${cause.message}`);
    });

    return client;
  }
}
