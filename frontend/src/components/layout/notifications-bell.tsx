'use client';

import {
  Bell,
  CheckCheck,
  Inbox,
  type LucideIcon,
  UserPlus,
  Clock,
  Flame,
  Megaphone,
  Settings,
  CheckCircle2,
  AtSign,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { cn } from 'cn';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api';

type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'task_mentioned'
  | 'team_joined'
  | 'member_invited'
  | 'request_decided'
  | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  actor: { id: string; name: string } | null;
}

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  task_assigned: Flame,
  task_status_changed: Clock,
  task_mentioned: AtSign,
  team_joined: UserPlus,
  member_invited: UserPlus,
  request_decided: CheckCircle2,
  system: Megaphone,
};

const TYPE_TONE: Record<NotificationType, string> = {
  task_assigned: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  task_status_changed: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  task_mentioned: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  team_joined: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  member_invited: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  request_decided: 'bg-primary/15 text-primary',
  system: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

const POLL_INTERVAL = 30_000;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'à l’instant';
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Bell + dropdown.
 *
 * Polls the unread count every 30 s so the badge stays live without a
 * websocket. Opening the menu fetches the full list; clicking an item marks
 * it read and navigates (if the notification carries a link); the "tout
 * marquer" button clears the badge in one request.
 */
export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [items, setItems] = React.useState<Notification[] | null>(null);

  const refreshCount = React.useCallback(() => {
    void apiFetch<{ count: number }>('/notifications/unread-count')
      .then((r) => setCount(r.count))
      .catch(() => {
        /* backend down: keep the previous badge */
      });
  }, []);

  const loadList = React.useCallback(() => {
    void apiFetch<Notification[]>('/notifications')
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  React.useEffect(() => {
    refreshCount();
    const id = window.setInterval(refreshCount, POLL_INTERVAL);
    return () => window.clearInterval(id);
  }, [refreshCount]);

  React.useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  async function onItemClick(n: Notification) {
    if (!n.readAt) {
      try {
        await apiFetch(`/notifications/${n.id}/read`, { method: 'PATCH' });
      } catch {
        /* ignore */
      }
      setCount((c) => Math.max(0, c - 1));
      setItems((prev) =>
        prev
          ? prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
          : prev,
      );
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link as never);
    }
  }

  async function markAllRead() {
    try {
      await apiFetch<{ count: number }>('/notifications/read-all', { method: 'POST' });
    } catch {
      /* ignore */
    }
    setCount(0);
    setItems((prev) =>
      prev ? prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })) : prev,
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${count > 0 ? ` (${count} non lues)` : ''}`}
          className="relative"
        >
          <Bell className="size-4" />
          {count > 0 ? (
            <span
              aria-hidden
              className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold leading-none shadow-sm"
            >
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[90vw] p-0">
        <div className="border-border/60 flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Inbox className="text-muted-foreground size-4" aria-hidden />
            <span className="text-sm font-semibold">Notifications</span>
          </div>
          {count > 0 ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllRead}>
              <CheckCheck className="size-3.5" />
              Tout marquer lu
            </Button>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {items === null ? (
            <div className="text-muted-foreground p-4 text-center text-xs">Chargement…</div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 p-6 text-center text-xs">
              <Inbox className="size-6 opacity-40" aria-hidden />
              <span>Aucune notification pour le moment.</span>
            </div>
          ) : (
            <ul>
              {items.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Settings;
                const tone = TYPE_TONE[n.type] ?? TYPE_TONE.system;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={cn(
                        'hover:bg-muted/40 border-border/40 flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left transition-colors last:border-b-0',
                        !n.readAt && 'bg-primary/5',
                      )}
                    >
                      <span
                        className={`${tone} mt-0.5 grid size-7 shrink-0 place-items-center rounded-full`}
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1">
                          <span className="text-foreground min-w-0 flex-1 text-xs font-medium leading-snug">
                            {n.title}
                          </span>
                          {!n.readAt ? (
                            <span
                              className="bg-primary mt-1 size-1.5 shrink-0 rounded-full"
                              aria-hidden
                            />
                          ) : null}
                        </div>
                        {n.body ? (
                          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-snug">
                            {n.body}
                          </p>
                        ) : null}
                        <p className="text-muted-foreground mt-1 text-[10px]">
                          {n.actor ? `${n.actor.name} · ` : ''}
                          {relativeTime(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
