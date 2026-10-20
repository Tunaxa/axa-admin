'use client';

import { Trash2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { fromLocalInput, toLocalInput } from './date-utils';
import {
  type CalendarEvent,
  type CreateEventInput,
  type EventColor,
  EVENT_COLORS,
} from './types';

interface EventDialogProps {
  open: boolean;
  event: CalendarEvent | null;
  initialStart?: Date;
  initialEnd?: Date;
  onClose: () => void;
  onSave: (payload: CreateEventInput, id: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * The create and edit dialog share one component: nine fields that are nearly
 * identical, and splitting them would mean keeping two shapes in sync.
 */
export function EventDialog({
  open,
  event,
  initialStart,
  initialEnd,
  onClose,
  onSave,
  onDelete,
}: EventDialogProps) {
  // Initial values come from props exactly once per mount: the parent
  // remounts this component with a fresh `key` when it opens for a different
  // event or slot, so there is no reset-in-effect to synchronise.
  const defaults = React.useMemo(() => {
    if (event) {
      return {
        title: event.title,
        description: event.description ?? '',
        location: event.location ?? '',
        start: toLocalInput(new Date(event.startAt)),
        end: toLocalInput(new Date(event.endAt)),
        allDay: event.allDay,
        color: event.color,
      };
    }
    const s = initialStart ?? new Date();
    const e = initialEnd ?? new Date(s.getTime() + 60 * 60 * 1000);
    return {
      title: '',
      description: '',
      location: '',
      start: toLocalInput(s),
      end: toLocalInput(e),
      allDay: false,
      color: 'sky' as EventColor,
    };
    // Props are read on mount only; this memo exists for the initial values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [title, setTitle] = React.useState(defaults.title);
  const [description, setDescription] = React.useState(defaults.description);
  const [location, setLocation] = React.useState(defaults.location);
  const [start, setStart] = React.useState(defaults.start);
  const [end, setEnd] = React.useState(defaults.end);
  const [allDay, setAllDay] = React.useState(defaults.allDay);
  const [color, setColor] = React.useState<EventColor>(defaults.color);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setError(null);

    if (!title.trim()) {
      setError('A title is required');
      return;
    }

    const startDate = fromLocalInput(start);
    const endDate = fromLocalInput(end);

    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
      setError('Start is invalid');
      return;
    }
    if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
      setError('End is invalid');
      return;
    }
    if (endDate <= startDate) {
      setError('End must be after start');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          allDay,
          color,
        },
        event?.id ?? null,
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    setSaving(true);
    try {
      await onDelete(event.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit event' : 'New event'}</DialogTitle>
          <DialogDescription>
            {event ? 'Change the details or delete this event.' : 'Add an entry to the shared calendar.'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-3 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Title</span>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly sync"
              maxLength={200}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Start</span>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">End</span>
              <Input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            <span>All day</span>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Location</span>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Room 2, or a link"
              maxLength={200}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Notes</span>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </label>

          <fieldset className="grid gap-1">
            <legend className="text-sm text-muted-foreground">Colour</legend>
            <div className="flex gap-1.5">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={`size-6 rounded-full border transition-all ${colorSwatch(c)} ${
                    color === c
                      ? 'ring-2 ring-ring ring-offset-2 ring-offset-background scale-110'
                      : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </fieldset>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="pt-2">
            {event ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : event ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function colorSwatch(c: EventColor): string {
  switch (c) {
    case 'sky':
      return 'bg-sky-500 border-sky-600';
    case 'violet':
      return 'bg-violet-500 border-violet-600';
    case 'emerald':
      return 'bg-emerald-500 border-emerald-600';
    case 'amber':
      return 'bg-amber-500 border-amber-600';
    case 'rose':
      return 'bg-rose-500 border-rose-600';
    case 'slate':
      return 'bg-slate-500 border-slate-600';
  }
}
