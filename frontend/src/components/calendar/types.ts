export const EVENT_COLORS = [
  'sky',
  'violet',
  'emerald',
  'amber',
  'rose',
  'slate',
] as const;
export type EventColor = (typeof EVENT_COLORS)[number];

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: EventColor;
  createdBy: { id: string; name: string };
}

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  color?: EventColor;
}

export type UpdateEventInput = Partial<CreateEventInput>;

export type CalendarViewMode = 'month' | 'week' | 'day';
