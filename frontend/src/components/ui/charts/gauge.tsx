'use client';

import * as React from 'react';

/**
 * Semi-circle gauge.
 *
 * Reads a 0–100 percentage and sweeps a brand arc from left to right. The
 * big number sits in the arc's hollow — a shape readers already associate
 * with a conversion rate or a score, no legend needed.
 */
export function Gauge({
  value,
  label,
  size = 160,
  tone = 'brand',
}: {
  value: number | null;
  label?: string;
  size?: number;
  tone?: 'brand' | 'emerald' | 'rose' | 'amber';
}) {
  const strokeWidth = Math.max(8, size * 0.09);
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const clamped = value === null ? 0 : Math.max(0, Math.min(1, value));
  const dash = clamped * circumference;

  const toneClass =
    tone === 'emerald'
      ? 'stroke-emerald-500'
      : tone === 'rose'
        ? 'stroke-rose-500'
        : tone === 'amber'
          ? 'stroke-amber-500'
          : 'stroke-primary';

  const height = size / 2 + strokeWidth;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={height}
        viewBox={`0 0 ${size} ${height}`}
        role="img"
        aria-label={label ?? 'Gauge'}
      >
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-muted"
        />
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className={`${toneClass} transition-[stroke-dasharray] duration-500`}
        />
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-foreground font-semibold tabular-nums"
          style={{ fontSize: Math.max(16, size * 0.2) }}
        >
          {value === null ? '—' : `${Math.round(clamped * 100)}%`}
        </text>
      </svg>
      {label ? (
        <span className="text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
      ) : null}
    </div>
  );
}
