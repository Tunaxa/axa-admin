'use client';

import { cn } from 'cn';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAccess } from '@/components/providers/access-provider';

import { NAV_GROUPS, NAV_ITEMS } from './nav-items';

/**
 * Primary navigation.
 *
 * Items grouped by domain; the active route is highlighted with the brand
 * tone and a vertical rail on the left — the shape most modern SaaS products
 * (Linear, Vercel, Height) use to anchor the eye.
 *
 * Hidden below `md`; mobile navigation would belong to the task that
 * introduces a drawer trigger in the top bar.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const access = useAccess();

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r border-sidebar-border md:flex">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span className="bg-primary text-primary-foreground relative grid size-8 place-items-center rounded-lg text-sm font-bold shadow-sm">
          A
          <span
            className="bg-primary/40 absolute inset-0 -z-10 scale-110 rounded-lg blur-md"
            aria-hidden
          />
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold tracking-tight">AXA Admin</span>
          <span className="text-muted-foreground truncate text-[11px]">Operations hub</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3" aria-label="Main">
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter(
            (item) => item.group === group.id && access.can(item.permission),
          );
          if (items.length === 0) return null;

          return (
            <div key={group.id} className="mt-3 first:mt-1">
              <div className="text-muted-foreground px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider">
                {group.label}
              </div>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isCurrent =
                    item.href !== undefined &&
                    (item.href === '/'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`));

                  const className = cn(
                    'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-all duration-150',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    isCurrent
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  );

                  return (
                    <li key={item.key}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={className}
                        >
                          {isCurrent ? (
                            <span
                              className="bg-primary absolute inset-y-1.5 left-0 w-0.5 rounded-full"
                              aria-hidden
                            />
                          ) : null}
                          <Icon
                            className={cn(
                              'size-4 shrink-0 transition-colors',
                              isCurrent
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-foreground',
                            )}
                            aria-hidden
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={cn(className, 'cursor-not-allowed opacity-50')}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">{item.label}</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-sidebar-border mx-2 mb-2 rounded-xl border bg-sidebar-accent/40 p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-foreground text-xs font-medium">Prod-ready in flight</span>
            <span className="text-muted-foreground text-[11px] leading-snug">
              Press <kbd className="bg-muted rounded border px-1 font-mono text-[10px]">?</kbd> to
              see every shortcut.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
