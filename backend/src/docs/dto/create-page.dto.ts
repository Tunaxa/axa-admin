import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { BlockDto } from './block.dto.js';

export class CreatePageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  /**
   * The URL segment. Lower-case words joined by single hyphens, because the
   * slug is what `/docs/<slug>` resolves and anything else would need escaping
   * to appear there.
   */
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lower-case words separated by single hyphens',
  })
  @MaxLength(255)
  slug!: string;

  /** The page this one sits under. Omitted or null puts it at the root. */
  @IsOptional()
  @IsMongoId()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks?: BlockDto[];
}
