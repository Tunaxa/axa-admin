/**
 * The focus ring every interactive element wears.
 *
 * `focus-visible` rather than `focus`, so a mouse click does not leave a ring
 * behind — which is the reason people disable focus styles in the first
 * place.
 */
export const FOCUS_RING =
  'outline-none focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background';
