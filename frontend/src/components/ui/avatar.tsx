import * as React from 'react';
import { cn } from 'cn';

/**
 * Deterministic avatar.
 *
 * Hashes the identity key to one of six brand-adjacent hues so the same
 * person always wears the same colour across the app. Font-smoothed and
 * sharp-edged — a modern SaaS detail that reads at any size.
 */

const HUES = [
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
];

function hashHue(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length] ?? HUES[0]!;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return `${(parts[0] ?? '')[0] ?? ''}${(parts[1] ?? '')[0] ?? ''}`.toUpperCase();
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  seed?: string;
}

const SIZE_CLASS = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-[11px]',
  lg: 'size-10 text-sm',
};

export function Avatar({
  name,
  seed,
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  const tone = hashHue(seed ?? name);
  return (
    <span
      aria-label={name}
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        SIZE_CLASS[size],
        tone,
        className,
      )}
      {...props}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Stacked avatar group — "+N" overflow when more than `max`. */
export function AvatarStack({
  names,
  max = 3,
  size = 'sm',
}: {
  names: string[];
  max?: number;
  size?: AvatarProps['size'];
}) {
  const visible = names.slice(0, max);
  const extra = names.length - visible.length;
  const ring = 'ring-2 ring-background';
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} className={ring} />
      ))}
      {extra > 0 ? (
        <span
          className={cn(
            'bg-muted text-muted-foreground inline-flex items-center justify-center rounded-full font-semibold',
            SIZE_CLASS[size ?? 'sm'],
            ring,
          )}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
