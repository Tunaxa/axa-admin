import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * What the requester may change while a request is still open.
 *
 * Not the application: a request for a different product is a different
 * request, and letting it be swapped after an approver has looked at it would
 * mean approving one thing and provisioning another.
 */
export class UpdateRequestDto {
  @IsOptional()
  @IsEmail()
  requesterEmail?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  requesterName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
