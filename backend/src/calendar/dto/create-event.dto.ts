import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * The short palette the frontend knows how to render. Keeping it closed in a
 * DTO rather than open-ended means a stray value cannot slip into the UI and
 * fall back to a muted default that nobody notices.
 */
export const EVENT_COLORS = [
  'sky',
  'violet',
  'emerald',
  'amber',
  'rose',
  'slate',
] as const;
export type EventColor = (typeof EVENT_COLORS)[number];

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsIn(EVENT_COLORS as unknown as string[])
  color?: EventColor;
}
