import { Role } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateTeamMemberDto {
  /** An existing user in the caller's tenant. */
  @IsUUID()
  userId!: string;

  /** Falls back to the schema default (`viewer`) when omitted. */
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
