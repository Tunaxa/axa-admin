import { AppKey, IssuePriority } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

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
}
