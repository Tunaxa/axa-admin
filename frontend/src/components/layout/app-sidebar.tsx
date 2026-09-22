import { cn } from 'cn';

import { NAV_ITEMS } from './nav-items';

/**
 * Primary navigation.
 *
 * Hidden below `md` for now — the mobile drawer needs open/close behaviour,
 * which belongs to the task that makes navigation work.
 */
export function AppSidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded text-xs font-semibold">
          A
        </span>
        <span className="text-sm font-semibold">AXA Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2" aria-label="Main">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            // Static until routing exists; the first item stands in for the
            // current page so the active style is visible.
            const isCurrent = index === 0;

            return (
              <li key={item.key}>
                <button
                  type="button"
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    isCurrent
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
