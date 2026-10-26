import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';

/**
 * Tasteful empty state.
 *
 * Icon in a soft brand-tinted square, centred title, muted hint, optional
 * action slot. Replaces the bare "No data" string that lists usually fall
 * back to and reads like something a product designer would ship.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex max-w-xs flex-col gap-1">
        <h3 className="text-foreground text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
