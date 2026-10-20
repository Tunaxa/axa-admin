import { apiFetch } from '@/lib/api';

import type {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
} from './types';

export async function fetchEvents(
  from: Date,
  to: Date,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });

  return apiFetch<CalendarEvent[]>(`/calendar/events?${params.toString()}`);
}

export async function createEvent(
  input: CreateEventInput,
): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>('/calendar/events', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateEvent(
  id: string,
  input: UpdateEventInput,
): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/calendar/events/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteEvent(id: string): Promise<void> {
  await apiFetch<void>(`/calendar/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
