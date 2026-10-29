/** A rendered message, ready to hand to a transport. */
export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export interface RequestEmailContext {
  requesterName: string;
  app: string;
  /** The approver's note: a reason, or what else is needed. */
  note: string | null;
  /** Where to pay. Only an approval has one. */
  checkoutUrl?: string | null;
  /** Who to reply to, shown in the body so the thread has a human in it. */
  decidedByName?: string | null;
}

/**
 * Escapes text for HTML.
 *
 * The note is written by one person and read by another in a mail client, so
 * it is exactly the kind of text that must not be able to carry markup. An
 * approver who types `<b>` should see `<b>`, and one who pastes an `<img
 * onerror=…>` should achieve nothing at all.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function approvedEmail(context: RequestEmailContext): RenderedEmail {
  const lines = [
    `Hello ${context.requesterName},`,
    '',
    `Your request for access to ${context.app} has been approved.`,
  ];

  if (context.checkoutUrl) {
    lines.push(
      '',
      'To finish, complete the payment here:',
      context.checkoutUrl,
      '',
      'The account is set up once the payment goes through.',
    );
  }

  return render({
    subject: `Your ${context.app} request was approved`,
    lines,
    context,
    // A link is the point of this message, so it gets a button rather than a
    // line of text somebody has to find.
    action: context.checkoutUrl
      ? { url: context.checkoutUrl, label: 'Complete the payment' }
      : null,
  });
}

export function rejectedEmail(context: RequestEmailContext): RenderedEmail {
  return render({
    subject: `Your ${context.app} request was declined`,
    lines: [
      `Hello ${context.requesterName},`,
      '',
      `Your request for access to ${context.app} was not approved.`,
    ],
    context,
    action: null,
    // The reason is the whole message here, so it is labelled rather than
    // dropped in as an afterthought.
    noteLabel: 'Reason',
  });
}

export function needsMoreInfoEmail(
  context: RequestEmailContext,
): RenderedEmail {
  return render({
    subject: `More detail needed for your ${context.app} request`,
    lines: [
      `Hello ${context.requesterName},`,
      '',
      `Before your request for ${context.app} can be decided, we need a little more detail.`,
    ],
    context,
    action: null,
    noteLabel: 'What is needed',
  });
}

function render({
  subject,
  lines,
  context,
  action,
  noteLabel = 'Note',
}: {
  subject: string;
  lines: string[];
  context: RequestEmailContext;
  action: { url: string; label: string } | null;
  noteLabel?: string;
}): RenderedEmail {
  const body = [...lines];

  if (context.note) {
    body.push('', `${noteLabel}: ${context.note}`);
  }

  if (context.decidedByName) {
    body.push('', `— ${context.decidedByName}, AXA Admin`);
  } else {
    body.push('', '— AXA Admin');
  }

  return {
    subject,
    // Sent alongside the HTML, not instead of it: some people read mail as
    // text, some clients refuse HTML, and a message with no text part is
    // treated as more likely to be spam.
    text: body.join('\n'),
    html: toHtml(body, action),
  };
}

function toHtml(
  lines: string[],
  action: { url: string; label: string } | null,
): string {
  const paragraphs = lines
    .join('\n')
    .split('\n\n')
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('\n    ');

  const button = action
    ? `\n    <p><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:10px 18px;background:#0a0a0a;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(action.label)}</a></p>`
    : '';

  // Inline styles and a table-free layout: mail clients strip stylesheets, and
  // anything cleverer than this renders differently in every one of them.
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#111">
    ${paragraphs}${button}
  </body>
</html>`;
}
