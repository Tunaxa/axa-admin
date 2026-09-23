import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { BLOCK_TYPES, type BlockType } from '../schemas/block.schema.js';

/** One content block, as it arrives on the wire. */
export class BlockDto {
  // `IsIn`, not `IsEnum`: the types are a readonly array rather than a TS enum,
  // and `IsEnum` given one reports "must be one of the following values:" with
  // nothing after it — an error message that tells the caller nothing.
  @IsIn(BLOCK_TYPES)
  type!: BlockType;

  /**
   * Optional, because some block types carry no text at all — a `divider` is
   * the whole block. Absent means empty, which is what the schema stores.
   */
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  text?: string;

  /**
   * Per-type extras: `language` on `code`, `url` and `alt` on `image`, `icon`
   * on `callout`. Checked to be an object and no further — which keys a type
   * accepts is a rule this API does not yet enforce.
   */
  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}
