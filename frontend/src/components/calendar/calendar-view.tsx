'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { FOCUS_RING } from '@/lib/focus';

import { createEvent, deleteEvent, fetchEvents, updateEvent } from './calendar-api';
import {
  addDays,
  addMonths,
  endOfDay,
  formatMonthTitle,
  formatTime,
  formatWeekTitle,
  monthGridDays,
  overlapsDay,
  sameDay,
  sameMonth,
  startOfDay,
  startOfWeek,
  WEEKDAYS,
  weekDays,
} from './date-utils';
import { EventDialog } from './event-dialog';
import { EVENT_CHIP_CLASSES } from './event-colors';
import type { CalendarEvent, CalendarViewMode, CreateEventInput } from './types';

type DialogState =
  | { kind: 'closed' }
  | { kind: 'create'; start: Date; end: Date }
  | { kind: 'edit'; event: CalendarEvent };

export function CalendarView() {
  const [view, setView] = React.useState<CalendarViewMode>('month');
  const [reference, setReference] = React.useState<Date>(() => new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<DialogState>({ kind: 'closed' });

  const { from, to } = React.useMemo(() => visibleRange(reference, view), [reference, view]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchEvents(from, to);
      setEvents(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    // Fetching bounded by the visible range: this is the external-system
    // sync the rule's documentation describes, not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Keyboard shortcuts — Notion-style single letters, scoped to the page.
  // Ignored while a text field is focused, so typing in the dialog does not
  // flip the view.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case 'm':
          setView('month');
          break;
        case 'w':
          setView('week');
          break;
        case 'd':
          setView('day');
          break;
        case 't':
          setReference(new Date());
          break;
        case 'c':
        case 'n': {
          const now = new Date();
          const start = roundToNextHour(now);
          setDialog({
            kind: 'create',
            start,
            end: new Date(start.getTime() + 60 * 60 * 1000),
          });
          break;
        }
        case 'ArrowLeft':
          e.preventDefault();
          setReference((r) => stepReference(r, view, -1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setReference((r) => stepReference(r, view, 1));
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  async function handleSave(payload: CreateEventInput, id: string | null) {
    if (id) {
      await updateEvent(id, payload);
    } else {
      await createEvent(payload);
    }
    await load();
  }

  async function handleDelete(id: string) {
    await deleteEvent(id);
    await load();
  }

  function openCreateAt(day: Date, hour?: number) {
    const start = new Date(day);
    start.setHours(hour ?? 9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setDialog({ kind: 'create', start, end });
  }

  async function moveEvent(ev: CalendarEvent, newStart: Date) {
    const span = new Date(ev.endAt).getTime() - new Date(ev.startAt).getTime();
    const newEnd = new Date(newStart.getTime() + span);
    // Optimistic: patch locally first so the UI responds without waiting.
    setEvents((list) =>
      list.map((x) =>
        x.id === ev.id ? { ...x, startAt: newStart.toISOString(), endAt: newEnd.toISOString() } : x,
      ),
    );
    try {
      await updateEvent(ev.id, {
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to move event');
      await load();
    }
  }

  return (
    <section className="flex h-full flex-col">
      <Toolbar
        view={view}
        onViewChange={setView}
        reference={reference}
        onReferenceChange={setReference}
        onCreate={() => openCreateAt(new Date())}
      />

      {error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex-1 overflow-auto">
        {view === 'month' ? (
          <MonthView
            reference={reference}
            events={events}
            onCreateAt={openCreateAt}
            onEdit={(ev) => setDialog({ kind: 'edit', event: ev })}
            onMove={moveEvent}
          />
        ) : view === 'week' ? (
          <WeekView
            reference={reference}
            events={events}
            onCreateAt={openCreateAt}
            onEdit={(ev) => setDialog({ kind: 'edit', event: ev })}
            onMove={moveEvent}
          />
        ) : (
          <DayView
            reference={reference}
            events={events}
            onCreateAt={openCreateAt}
            onEdit={(ev) => setDialog({ kind: 'edit', event: ev })}
            onMove={moveEvent}
          />
        )}
      </div>

      {loading ? (
        <div className="pointer-events-none fixed bottom-6 right-6 rounded-md bg-background/90 border px-3 py-1.5 text-xs text-muted-foreground shadow-md">
          Loading…
        </div>
      ) : null}

      {dialog.kind !== 'closed' ? (
        <EventDialog
          // Fresh mount per open: initial values are read from props once,
          // which is what the lint rule wants and keeps the form logic simple.
          key={
            dialog.kind === 'edit'
              ? `edit:${dialog.event.id}`
              : `create:${dialog.start.toISOString()}`
          }
          open
          event={dialog.kind === 'edit' ? dialog.event : null}
          initialStart={dialog.kind === 'create' ? dialog.start : undefined}
          initialEnd={dialog.kind === 'create' ? dialog.end : undefined}
          onClose={() => setDialog({ kind: 'closed' })}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}
    </section>
  );
}

function Toolbar({
  view,
  onViewChange,
  reference,
  onReferenceChange,
  onCreate,
}: {
  view: CalendarViewMode;
  onViewChange: (v: CalendarViewMode) => void;
  reference: Date;
  onReferenceChange: (d: Date) => void;
  onCreate: () => void;
}) {
  const title =
    view === 'month'
      ? formatMonthTitle(reference)
      : view === 'week'
        ? formatWeekTitle(reference)
        : reference.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2.5">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onReferenceChange(stepReference(reference, view, -1))}
          aria-label="Previous"
          className={FOCUS_RING}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onReferenceChange(stepReference(reference, view, 1))}
          aria-label="Next"
          className={FOCUS_RING}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReferenceChange(new Date())}
          className={FOCUS_RING}
        >
          Today
        </Button>
      </div>

      <h1 className="text-base font-semibold">{title}</h1>

      <div className="ml-auto flex items-center gap-1">
        <div className="flex rounded-md border border-input p-0.5">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              aria-pressed={view === v}
              className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                view === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              } ${FOCUS_RING}`}
            >
              {v}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onCreate} className={FOCUS_RING}>
          <Plus />
          New
        </Button>
      </div>

      <p className="w-full text-[11px] text-muted-foreground">
        Shortcuts: <Kbd>m</Kbd>onth · <Kbd>w</Kbd>eek · <Kbd>d</Kbd>ay · <Kbd>t</Kbd>oday ·{' '}
        <Kbd>c</Kbd> create · <Kbd>←</Kbd>/<Kbd>→</Kbd> navigate
      </p>
    </header>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-4 justify-center rounded border border-border bg-muted px-1 font-mono text-[10px]">
      {children}
    </kbd>
  );
}

interface GridProps {
  reference: Date;
  events: CalendarEvent[];
  onCreateAt: (day: Date, hour?: number) => void;
  onEdit: (ev: CalendarEvent) => void;
  onMove: (ev: CalendarEvent, newStart: Date) => void | Promise<void>;
}

function MonthView({ reference, events, onCreateAt, onEdit, onMove }: GridProps) {
  const days = monthGridDays(reference);
  const today = new Date();

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function onDrop(e: React.DragEvent, day: Date) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/x-calendar-event');
    const ev = events.find((x) => x.id === id);
    if (!ev) return;
    const originalStart = new Date(ev.startAt);
    const newStart = new Date(day);
    newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
    void onMove(ev, newStart);
  }

  return (
    <div className="grid h-full grid-cols-7 grid-rows-[auto_repeat(6,1fr)] text-sm">
      {WEEKDAYS.map((d) => (
        <div
          key={d}
          className="border-b border-border bg-muted/30 px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {d}
        </div>
      ))}
      {days.map((day, i) => {
        const dayEvents = events
          .filter((e) => overlapsDay(e, day))
          .sort((a, b) => a.startAt.localeCompare(b.startAt));
        const dim = !sameMonth(day, reference);
        const isToday = sameDay(day, today);
        return (
          <div
            key={day.toISOString()}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, day)}
            onDoubleClick={() => onCreateAt(day)}
            className={`relative min-h-24 border-b border-r border-border p-1 ${
              dim ? 'bg-muted/20 text-muted-foreground' : ''
            } ${i % 7 === 6 ? 'border-r-0' : ''}`}
          >
            <button
              type="button"
              onClick={() => onCreateAt(day)}
              className={`mb-0.5 inline-flex size-6 items-center justify-center rounded-full text-xs ${
                isToday ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted'
              } ${FOCUS_RING}`}
              aria-label={`Create on ${day.toDateString()}`}
            >
              {day.getDate()}
            </button>
            <ul className="space-y-0.5">
              {dayEvents.slice(0, 3).map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/x-calendar-event', ev.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(ev);
                    }}
                    className={`w-full truncate border-l-2 rounded px-1.5 py-0.5 text-left text-xs ${
                      EVENT_CHIP_CLASSES[ev.color]
                    } ${FOCUS_RING}`}
                  >
                    {!ev.allDay ? (
                      <span className="opacity-60 mr-1">{formatTime(new Date(ev.startAt))}</span>
                    ) : null}
                    {ev.title}
                  </button>
                </li>
              ))}
              {dayEvents.length > 3 ? (
                <li className="px-1 text-[10px] text-muted-foreground">
                  +{dayEvents.length - 3} more
                </li>
              ) : null}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_PX = 40; // one hour

function WeekView({ reference, events, onCreateAt, onEdit, onMove }: GridProps) {
  return (
    <TimeGrid
      days={weekDays(reference)}
      events={events}
      onCreateAt={onCreateAt}
      onEdit={onEdit}
      onMove={onMove}
    />
  );
}

function DayView({ reference, events, onCreateAt, onEdit, onMove }: GridProps) {
  return (
    <TimeGrid
      days={[startOfDay(reference)]}
      events={events}
      onCreateAt={onCreateAt}
      onEdit={onEdit}
      onMove={onMove}
    />
  );
}

type TimeGridProps = Omit<GridProps, 'reference'> & { days: Date[] };

function TimeGrid({ days, events, onCreateAt, onEdit, onMove }: TimeGridProps) {
  const today = new Date();

  function dayColumnDrop(e: React.DragEvent, day: Date) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/x-calendar-event');
    const ev = events.find((x) => x.id === id);
    if (!ev) return;
    // Translate pixel offset to minutes (SLOT_PX per hour).
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const minutes = Math.max(0, Math.round(((e.clientY - rect.top) / SLOT_PX) * 60));
    const newStart = new Date(day);
    newStart.setHours(0, 0, 0, 0);
    newStart.setMinutes(Math.round(minutes / 15) * 15);
    void onMove(ev, newStart);
  }

  return (
    <div
      className="grid h-full"
      style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
    >
      {/* header row */}
      <div className="border-b border-r border-border bg-muted/30" />
      {days.map((d) => (
        <div
          key={d.toISOString()}
          className="border-b border-r border-border bg-muted/30 px-2 py-1.5 text-center text-xs"
        >
          <div className="font-medium uppercase tracking-wide text-muted-foreground">
            {d.toLocaleDateString(undefined, { weekday: 'short' })}
          </div>
          <div className={`text-sm ${sameDay(d, today) ? 'text-primary font-semibold' : ''}`}>
            {d.getDate()}
          </div>
        </div>
      ))}

      {/* time + columns */}
      <div
        className="col-span-full grid"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div className="relative">
          {HOURS.map((h) => (
            <div
              key={h}
              className="relative border-r border-border text-right text-[10px] text-muted-foreground"
              style={{ height: SLOT_PX }}
            >
              <span className="absolute -top-1.5 right-1">{h.toString().padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {days.map((day) => (
          <div
            key={day.toISOString()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => dayColumnDrop(e, day)}
            onDoubleClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const hour = Math.floor((e.clientY - rect.top) / SLOT_PX);
              onCreateAt(day, hour);
            }}
            className="relative border-r border-border"
          >
            {HOURS.map((h) => (
              <div key={h} className="border-b border-border/50" style={{ height: SLOT_PX }} />
            ))}
            {events
              .filter((e) => sameDay(new Date(e.startAt), day))
              .map((ev) => {
                const start = new Date(ev.startAt);
                const end = new Date(ev.endAt);
                const top = (start.getHours() + start.getMinutes() / 60) * SLOT_PX;
                const height = Math.max(
                  18,
                  ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * SLOT_PX,
                );
                return (
                  <button
                    key={ev.id}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/x-calendar-event', ev.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(ev);
                    }}
                    className={`absolute left-1 right-1 border-l-2 rounded px-1.5 py-0.5 text-left text-xs overflow-hidden ${
                      EVENT_CHIP_CLASSES[ev.color]
                    } ${FOCUS_RING}`}
                    style={{ top, height }}
                  >
                    <div className="font-medium truncate">{ev.title}</div>
                    <div className="text-[10px] opacity-70">
                      {formatTime(start)} – {formatTime(end)}
                    </div>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

function visibleRange(reference: Date, view: CalendarViewMode): { from: Date; to: Date } {
  if (view === 'month') {
    const grid = monthGridDays(reference);
    // `monthGridDays` always returns 42 entries, so these indices are safe.
    const first = grid[0]!;
    const last = grid[grid.length - 1]!;
    return { from: startOfDay(first), to: endOfDay(last) };
  }
  if (view === 'week') {
    const start = startOfWeek(reference);
    return { from: start, to: endOfDay(addDays(start, 6)) };
  }
  return { from: startOfDay(reference), to: endOfDay(reference) };
}

function stepReference(d: Date, view: CalendarViewMode, dir: 1 | -1): Date {
  if (view === 'month') return addMonths(d, dir);
  if (view === 'week') return addDays(d, 7 * dir);
  return addDays(d, dir);
}

function roundToNextHour(d: Date): Date {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  x.setHours(x.getHours() + 1);
  return x;
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
