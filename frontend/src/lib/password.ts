const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&';

/**
 * A random password drawn with the browser's CSPRNG.
 *
 * The alphabet leaves out look-alikes (0/O, 1/l/I) because the password is
 * handed over by reading it out or pasting it into a chat, and a typo there is
 * a locked-out colleague.
 */
export function randomPassword(length = 16): string {
  const bytes = new Uint8Array(length);

  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}
