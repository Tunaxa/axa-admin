/** The payload shape a Microsoft Teams incoming webhook accepts. */
export interface TeamsMessage {
  type: 'message';
  attachments: {
    contentType: 'application/vnd.microsoft.card.adaptive';
    contentUrl: null;
    content: Record<string, unknown>;
  }[];
}

export interface IssueAssignedNotification {
  issueTitle: string;
  assigneeName: string;
  actorName: string;
  status: string;
  priority: string;
  app?: string | null;
}

export interface DailyDigestEntry {
  authorName: string;
  shipped: string;
  blocked: string | null;
  next: string;
}

export interface DailyDigestNotification {
  date: string;
  entries: DailyDigestEntry[];
}

/** How many report entries a digest card carries before it is summarised. */
const MAX_DIGEST_ENTRIES = 15;

export function issueAssignedCard(
  notification: IssueAssignedNotification,
): TeamsMessage {
  return card([
    heading('Issue assigned'),
    text(escapeMarkdown(notification.issueTitle), { weight: 'Bolder' }),
    facts([
      ['Assigned to', notification.assigneeName],
      ['By', notification.actorName],
      ['Status', notification.status],
      ['Priority', notification.priority],
      ...(notification.app ? [['App', notification.app] as const] : []),
    ]),
  ]);
}

export function dailyDigestCard(
  notification: DailyDigestNotification,
): TeamsMessage {
  const shown = notification.entries.slice(0, MAX_DIGEST_ENTRIES);
  const hidden = notification.entries.length - shown.length;
  const blocked = notification.entries.filter((entry) => entry.blocked);

  const body: Record<string, unknown>[] = [
    heading(`Daily reports — ${notification.date}`),
    text(
      `${notification.entries.length} report${notification.entries.length === 1 ? '' : 's'}` +
        `, ${blocked.length} blocked`,
      { isSubtle: true },
    ),
  ];

  if (notification.entries.length === 0) {
    // Said out loud rather than sent as an empty card: "nobody reported" is
    // the one thing a team leader most needs the digest to tell them.
    body.push(text('Nobody filed a report for this day.', { wrap: true }));
  }

  for (const entry of shown) {
    body.push(text(escapeMarkdown(entry.authorName), { weight: 'Bolder' }));
    body.push(
      text(`Shipped: ${escapeMarkdown(entry.shipped)}`, { wrap: true }),
    );

    if (entry.blocked) {
      body.push(
        text(`Blocked: ${escapeMarkdown(entry.blocked)}`, { wrap: true }),
      );
    }

    body.push(text(`Next: ${escapeMarkdown(entry.next)}`, { isSubtle: true }));
  }

  if (hidden > 0) {
    body.push(text(`…and ${hidden} more.`, { isSubtle: true }));
  }

  return card(body);
}

function card(body: Record<string, unknown>[]): TeamsMessage {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body,
        },
      },
    ],
  };
}

function heading(value: string): Record<string, unknown> {
  return {
    type: 'TextBlock',
    text: value,
    size: 'Medium',
    weight: 'Bolder',
    wrap: true,
  };
}

function text(
  value: string,
  options: { weight?: string; isSubtle?: boolean; wrap?: boolean } = {},
): Record<string, unknown> {
  return { type: 'TextBlock', text: value, wrap: true, ...options };
}

function facts(
  pairs: readonly (readonly [string, string])[],
): Record<string, unknown> {
  return {
    type: 'FactSet',
    facts: pairs.map(([title, value]) => ({
      title,
      value: escapeMarkdown(value),
    })),
  };
}

/**
 * Neutralises the Markdown a Teams `TextBlock` interprets.
 *
 * Issue titles and report text are written by users, and the card is posted
 * into a channel where people trust what they read. Without this, a title of
 * `[Click here](https://example.invalid)` arrives as a working link that
 * nobody in the channel authored.
 */
export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_[\]])/g, '\\$1');
}
