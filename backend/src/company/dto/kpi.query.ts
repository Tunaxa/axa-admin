import { IsISO8601, IsOptional } from 'class-validator';

/**
 * The window a KPI is computed over.
 *
 * Instants rather than calendar days, for the same reason the closed-on
 * filter takes them: a day only exists in some timezone, and the caller knows
 * theirs. Defaults to the last thirty days.
 */
export class KpiQuery {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
