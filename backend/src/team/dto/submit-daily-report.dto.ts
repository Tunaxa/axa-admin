import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SubmitDailyReportDto {
  /** What was shipped today. */
  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  shipped!: string;

  /**
   * What is blocked.
   *
   * Omit it when nothing is — the column is nullable precisely so "no
   * blockers" and "did not say" stay distinguishable.
   */
  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  blocked?: string;

  /** What they are working on next. */
  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  next!: string;

  /** Issues this report refers to. Must belong to the caller's tenant. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  issueIds?: string[];
}
