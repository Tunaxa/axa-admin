import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateEventDto } from './dto/create-event.dto.js';
import type { ListEventsDto } from './dto/list-events.dto.js';
import type { UpdateEventDto } from './dto/update-event.dto.js';

/** The event shape returned to the frontend. */
export interface CalendarEventView {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  color: string;
  createdBy: { id: string; name: string };
}

@Injectable()
export class CalendarService {
  private static readonly SELECT = {
    id: true,
    title: true,
    description: true,
    location: true,
    startAt: true,
    endAt: true,
    allDay: true,
    color: true,
    createdBy: { select: { id: true, name: true } },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every event that overlaps the window, not only those entirely inside it:
   * a two-hour meeting that starts at 23:00 should appear on both days.
   */
  async list(
    organizationId: string,
    dto: ListEventsDto,
  ): Promise<CalendarEventView[]> {
    const from = new Date(dto.from);
    const to = new Date(dto.to);

    if (from >= to) {
      throw new BadRequestException('`from` must be before `to`');
    }

    return this.prisma.calendarEvent.findMany({
      where: {
        organizationId,
        // `start < to AND end > from` is the overlap test.
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: CalendarService.SELECT,
      orderBy: { startAt: 'asc' },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateEventDto,
  ): Promise<CalendarEventView> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (endAt <= startAt) {
      throw new BadRequestException('End must be after start');
    }

    return this.prisma.calendarEvent.create({
      data: {
        organizationId,
        createdById: userId,
        title: dto.title,
        description: dto.description ?? null,
        location: dto.location ?? null,
        startAt,
        endAt,
        allDay: dto.allDay ?? false,
        color: dto.color ?? 'sky',
      },
      select: CalendarService.SELECT,
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateEventDto,
  ): Promise<CalendarEventView> {
    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id, organizationId },
      select: { id: true, startAt: true, endAt: true },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;

    if (endAt <= startAt) {
      throw new BadRequestException('End must be after start');
    }

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && {
          description: dto.description ?? null,
        }),
        ...(dto.location !== undefined && { location: dto.location ?? null }),
        ...(dto.startAt !== undefined && { startAt }),
        ...(dto.endAt !== undefined && { endAt }),
        ...(dto.allDay !== undefined && { allDay: dto.allDay }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      select: CalendarService.SELECT,
    });
  }

  async remove(organizationId: string, id: string): Promise<void> {
    // `deleteMany` with the tenant in the filter so a guessed id in another
    // tenant throws the same "not found" rather than silently succeeding.
    const result = await this.prisma.calendarEvent.deleteMany({
      where: { id, organizationId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Event not found');
    }
  }
}
