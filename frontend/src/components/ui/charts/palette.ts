/**
 * Shared categorical palette for every chart in the app.
 *
 * Six brand-adjacent hues, picked so the same colour means the same slice
 * across donut, bar and legend — a reader learns one map and reuses it. CSS
 * variables and inline `fill="currentColor"` give each chart a hook the
 * surrounding element can override.
 */
export const CHART_COLORS = [
  'oklch(0.60 0.19 275)', // brand indigo
  'oklch(0.65 0.17 190)', // teal
  'oklch(0.72 0.20 85)', // gold
  'oklch(0.63 0.22 25)', // coral
  'oklch(0.60 0.21 325)', // magenta
  'oklch(0.60 0.08 265)', // slate
] as const;

export function colorAt(index: number): string {
  const palette = CHART_COLORS;
  return palette[index % palette.length] ?? palette[0];
}
