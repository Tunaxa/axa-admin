'use client';

import * as React from 'react';

/**
 * Sparkline.
 *
 * A single polyline over a soft fill, no axes, no labels — meant to live
 * inside a KPI card as a "shape of the last 7 days" cue, not as a chart in
 * its own right.
 */
export function Sparkline({
  values,
  width = 120,
  height = 36,
  tone = 'brand',
}: {
  values: number[];
  width?: number;
  height?: number;
  tone?: 'brand' | 'emerald' | 'rose' | 'amber';
}) {
  if (values.length === 0) {
    return <div style={{ width, height }} aria-hidden />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length === 1 ? 0 : width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const polyline = `0,${height} ${points} ${width},${height}`;

  const stroke =
    tone === 'emerald'
      ? 'stroke-emerald-500'
      : tone === 'rose'
        ? 'stroke-rose-500'
        : tone === 'amber'
          ? 'stroke-amber-500'
          : 'stroke-primary';
  const fill =
    tone === 'emerald'
      ? 'fill-emerald-500/15'
      : tone === 'rose'
        ? 'fill-rose-500/15'
        : tone === 'amber'
          ? 'fill-amber-500/15'
          : 'fill-primary/15';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      role="img"
      aria-label="Trend"
    >
      <polygon points={polyline} className={fill} />
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.75}
        className={stroke}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
