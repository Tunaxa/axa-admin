import { AppKey, IssuePriority } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';

/** Filters for `GET /issues`. All optional and combined with AND. */
export class ListIssuesQuery {
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(AppKey)
  app?: AppKey;

  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  /**
   * Closed at or after this instant.
   *
   * Instants rather than a calendar day, because `closedAt` is a timestamp and
   * a day only exists in some timezone — the caller's, which the server has no
   * way to know. The client sends the boundaries of its own day.
   */
  @IsOptional()
  @IsISO8601()
  closedAfter?: string;

  /** Closed strictly before this instant. */
  @IsOptional()
  @IsISO8601()
  closedBefore?: string;
}
