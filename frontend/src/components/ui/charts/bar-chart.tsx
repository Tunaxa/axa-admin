'use client';

import * as React from 'react';

import { colorAt } from './palette';

export interface BarDatum {
  label: string;
  value: number;
}

/**
 * Horizontal bar chart.
 *
 * One row per datum, bar width proportional to the row's value divided by the
 * largest value in the set. Pure SVG inside each row so it stays crisp at any
 * width and inherits the container's font — no library.
 */
export function BarChart({
  data,
  height = 10,
  maxRows = 8,
}: {
  data: BarDatum[];
  height?: number;
  maxRows?: number;
}) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-xs">Aucune donnée pour cette période.</p>;
  }

  const rows = [...data].sort((a, b) => b.value - a.value).slice(0, maxRows);
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row, i) => {
        const pct = (row.value / max) * 100;
        return (
          <li key={`${row.label}-${i}`} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-foreground truncate capitalize">{row.label}</span>
              <span className="text-muted-foreground tabular-nums">{row.value}</span>
            </div>
            <div className="bg-muted/60 overflow-hidden rounded-full" style={{ height }}>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: colorAt(i) }}
                aria-hidden
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
