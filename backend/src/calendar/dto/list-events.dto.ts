import { IsDateString } from 'class-validator';

/**
 * Every calendar read is bounded by a window.
 *
 * An unbounded listing would grow with the tenant's history: a year of daily
 * events is already a long response, and the month and week views only ever
 * need the span they are rendering.
 */
export class ListEventsDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
