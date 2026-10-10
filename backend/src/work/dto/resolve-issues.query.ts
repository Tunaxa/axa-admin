import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Filters for `GET /issues/resolve`.
 *
 * One of the two is required. `text` is a branch name or a pull request
 * title; `key` is a single reference.
 */
export class ResolveIssuesQuery {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  key?: string;
}
