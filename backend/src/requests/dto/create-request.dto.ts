import { AppKey } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRequestDto {
  /** Which AXA application the account is for. */
  @IsEnum(AppKey)
  app!: AppKey;

  /** Who the account is for — not a user of this service. */
  @IsEmail()
  requesterEmail!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  requesterName!: string;

  /** Anything the approver should know before deciding. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
