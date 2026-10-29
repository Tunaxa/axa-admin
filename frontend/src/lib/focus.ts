/**
 * The focus ring every interactive element wears.
 *
 * One constant rather than the classes repeated by hand: a focus style that
 * differs between a shadcn button and a hand-written one tells a keyboard
 * user that something changed when nothing did. The browser's default outline
 * is better than nothing, but it is thin, ignores the theme, and all but
 * disappears on a row that is already highlighted.
 *
 * `focus-visible` rather than `focus`, so a mouse click does not leave a ring
 * behind — which is the reason people disable focus styles in the first place.
 */
export const FOCUS_RING =
  'outline-none focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background';
