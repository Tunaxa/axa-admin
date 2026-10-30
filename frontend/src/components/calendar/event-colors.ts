import type { EventColor } from './types';

/**
 * Tailwind classes per palette entry.
 *
 * One lookup rather than conditionals scattered through every view, and
 * Tailwind's JIT sees every class as a literal here so none of them get
 * tree-shaken.
 */
export const EVENT_CHIP_CLASSES: Record<EventColor, string> = {
  sky: 'bg-sky-500/15 text-sky-900 border-l-sky-500 dark:text-sky-100',
  violet: 'bg-violet-500/15 text-violet-900 border-l-violet-500 dark:text-violet-100',
  emerald: 'bg-emerald-500/15 text-emerald-900 border-l-emerald-500 dark:text-emerald-100',
  amber: 'bg-amber-500/15 text-amber-900 border-l-amber-500 dark:text-amber-100',
  rose: 'bg-rose-500/15 text-rose-900 border-l-rose-500 dark:text-rose-100',
  slate: 'bg-slate-500/15 text-slate-900 border-l-slate-500 dark:text-slate-100',
};
