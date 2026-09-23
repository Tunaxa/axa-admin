import { IsOptional, IsUUID, Matches } from 'class-validator';

/** Filters for `GET /daily-reports`. All optional, combined with AND. */
export class ListDailyReportsQuery {
  /** A single working day, `YYYY-MM-DD`. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;
}
