'use client';

import * as React from 'react';

import { colorAt } from './palette';

export interface DonutDatum {
  label: string;
  value: number;
}

/**
 * Donut chart.
 *
 * Pure SVG, two concentric circles with each slice drawn by a `stroke-dasharray`
 * trick — no path arcs, no library. The hole in the middle shows the total so
 * the chart reads as "N things, split like this" at a glance.
 */
export function DonutChart({
  data,
  size = 160,
  thickness = 22,
  centreLabel = 'Total',
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centreLabel?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const centre = size / 2;

  // Precompute each slice's dash length and its starting offset. `reduce`
  // threads the running offset through immutably — the lint rule forbids
  // mutating a captured scalar inside a map callback.
  const slices = React.useMemo(
    () =>
      data.reduce<Array<DonutDatum & { length: number; offset: number }>>((acc, d) => {
        const length = total === 0 ? 0 : (d.value / total) * circumference;
        const offset =
          acc.length === 0 ? 0 : acc[acc.length - 1]!.offset + acc[acc.length - 1]!.length;
        acc.push({ ...d, length, offset });
        return acc;
      }, []),
    [data, total, circumference],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-5">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Donut chart totalling ${total}`}
          className="shrink-0"
        >
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            className="stroke-muted"
          />
          {total === 0 ? null : (
            <g transform={`rotate(-90 ${centre} ${centre})`}>
              {slices.map((d, i) => (
                <circle
                  key={`${d.label}-${i}`}
                  cx={centre}
                  cy={centre}
                  r={radius}
                  fill="none"
                  strokeWidth={thickness}
                  strokeDasharray={`${d.length} ${circumference - d.length}`}
                  strokeDashoffset={-d.offset}
                  stroke={colorAt(i)}
                  className="transition-[stroke-dashoffset,stroke-dasharray] duration-500"
                >
                  <title>
                    {d.label}: {d.value}
                  </title>
                </circle>
              ))}
            </g>
          )}
          <text
            x={centre}
            y={centre - 4}
            textAnchor="middle"
            className="fill-foreground text-2xl font-semibold tabular-nums"
            style={{ fontSize: Math.max(14, size * 0.17) }}
          >
            {total}
          </text>
          <text
            x={centre}
            y={centre + 14}
            textAnchor="middle"
            className="fill-muted-foreground text-xs uppercase tracking-wider"
          >
            {centreLabel}
          </text>
        </svg>

        <ul className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
          {data.length === 0 ? (
            <li className="text-muted-foreground text-xs">Aucune donnée pour cette période.</li>
          ) : null}
          {data.map((d, i) => (
            <li key={`${d.label}-${i}`} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ background: colorAt(i) }}
              />
              <span className="min-w-0 flex-1 truncate capitalize">{d.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {d.value}
                <span className="opacity-60">
                  {total === 0 ? '' : ` · ${Math.round((d.value / total) * 100)}%`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
