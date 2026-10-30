import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { type CalendarEventView, CalendarService } from './calendar.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { ListEventsDto } from './dto/list-events.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';

/**
 * The tenant comes from the verified token, never from the query string.
 */
@Controller('calendar/events')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @RequirePermissions('calendar:read')
  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListEventsDto,
  ): Promise<CalendarEventView[]> {
    return this.calendar.list(request.user.org, query);
  }

  @RequirePermissions('calendar:write')
  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateEventDto,
  ): Promise<CalendarEventView> {
    return this.calendar.create(request.user.org, request.user.sub, dto);
  }

  @RequirePermissions('calendar:write')
  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEventDto,
  ): Promise<CalendarEventView> {
    return this.calendar.update(request.user.org, id, dto);
  }

  @RequirePermissions('calendar:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.calendar.remove(request.user.org, id);
  }
}
