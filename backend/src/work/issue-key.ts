/** Characters that mean something to a regular expression. */
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/**
 * Finds issue keys in a branch name, a pull request title, or any other text.
 *
 * The prefix is required, and that is the whole design. Matching anything
 * shaped like `WORD-123` turns `fix/retry-3-times` into a reference to issue
 * `RETRY-3` and `feat/add-2-buttons` into `ADD-2`. Both are wrong, both look
 * plausible in a log, and neither would be noticed until somebody's pull
 * request was linked to a stranger's issue.
 *
 * Matching is case-insensitive, because branch names are usually not shouted:
 * `feat/axa-123-wire-the-webhook` is the same reference as `feat/AXA-123-...`.
 * Keys come back normalised to the stored form.
 */
export function parseIssueKeys(text: string, prefix: string): string[] {
  const safePrefix = prefix.replace(REGEX_SPECIAL, '\\$&');
  const pattern = new RegExp(
    `(?<![A-Za-z0-9])${safePrefix}-(\\d{1,9})(?!\\d)`,
    'gi',
  );
  const upper = prefix.toUpperCase();
  const found: string[] = [];

  for (const match of text.matchAll(pattern)) {
    // Leading zeros would make AXA-007 and AXA-7 two references to one issue.
    const key = `${upper}-${Number(match[1])}`;

    if (!found.includes(key)) {
      found.push(key);
    }
  }

  return found;
}

/** The first key in the text, which is the one a branch is named after. */
export function parseIssueKey(text: string, prefix: string): string | null {
  return parseIssueKeys(text, prefix)[0] ?? null;
}
