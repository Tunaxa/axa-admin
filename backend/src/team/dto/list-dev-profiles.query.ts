import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Filters for `GET /dev-profiles`. */
export class ListDevProfilesQuery {
  /**
   * Only people whose stack contains this technology.
   *
   * Matched against the normalised values, so `React` finds `react`. This is
   * the query the GIN index on `stack` exists for — "who here writes Go" is
   * the reason to record a stack at all.
   */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  stack?: string;
}
