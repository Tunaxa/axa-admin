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

/**
 * Every field is optional; only what is sent is changed.
 *
 * `blocks` is the exception worth reading twice: sending it **replaces** the
 * page's content. A page's content is an ordered list, and a partial update
 * has no way to say that a block was deleted — so a caller that wants to
 * change one paragraph sends the whole list back.
 */
export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lower-case words separated by single hyphens',
  })
  @MaxLength(255)
  slug?: string;

  /** `null` moves the page to the root of the tree. */
  @IsOptional()
  @IsMongoId()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  /** Replaces the page's content entirely. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks?: BlockDto[];
}
