/**
 * Date helpers for the calendar views.
 *
 * The week starts on Monday for a European team. All comparisons are done on
 * local time, since that is what the viewer sees in the grid; the backend
 * stores events in UTC and the API client converts both ways.
 */

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  // getDay(): Sunday is 0, Monday is 1 … shift so Monday is 0.
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

/** The 42 days (6 rows × 7 columns) that cover the month view. */
export function monthGridDays(reference: Date): Date[] {
  const first = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** The 7 days of the week containing `reference`. */
export function weekDays(reference: Date): Date[] {
  const start = startOfWeek(reference);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function formatMonthTitle(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatWeekTitle(d: Date): string {
  const start = startOfWeek(d);
  const end = addDays(start, 6);
  const sameMonthSpan = start.getMonth() === end.getMonth();
  const left = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const right = end.toLocaleDateString(undefined, {
    month: sameMonthSpan ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${left} – ${right}`;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Snap a date to the nearest 15 minutes, which is the finest grid the week
 * view uses. The seconds and milliseconds are cleared.
 */
export function snapToQuarterHour(d: Date): Date {
  const x = new Date(d);
  const quarters = Math.round(x.getMinutes() / 15);
  x.setMinutes(quarters * 15, 0, 0);
  return x;
}

export function overlapsDay(event: { startAt: string; endAt: string }, day: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();
  const s = new Date(event.startAt).getTime();
  const e = new Date(event.endAt).getTime();
  return s <= dayEnd && e >= dayStart;
}

/** ISO date in the viewer's local time, suitable for `datetime-local` inputs. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(s: string): Date {
  return new Date(s);
}
