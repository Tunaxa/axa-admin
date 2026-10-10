import { createHmac, timingSafeEqual } from 'node:crypto';

export const SIGNATURE_HEADER = 'x-hub-signature-256';

/**
 * Is this delivery really from GitHub?
 *
 * GitHub signs the **raw** request body with the webhook secret and sends the
 * result as `sha256=…`. Re-serialising the parsed JSON would not reproduce it
 * — key order and whitespace both matter — which is why the application is
 * configured to keep the raw buffer around.
 *
 * The comparison is timing-safe. A plain `===` leaks, through how long it
 * takes to fail, how much of a guessed signature was correct, and a signature
 * is exactly the kind of secret that can be guessed one byte at a time.
 */
export function verifySignature(
  rawBody: Buffer | undefined,
  header: string | undefined,
  secret: string,
): boolean {
  if (!rawBody || !header) {
    return false;
  }

  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const received = Buffer.from(header);
  const computed = Buffer.from(expected);

  // `timingSafeEqual` throws on a length mismatch, which is itself a
  // comparison — but the length of a hex digest is not a secret.
  return (
    received.length === computed.length && timingSafeEqual(received, computed)
  );
}
