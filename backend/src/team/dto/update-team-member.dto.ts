import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * Only the role can change.
 *
 * Moving a membership to a different user is not an edit — it is removing one
 * person and adding another.
 */
export class UpdateTeamMemberDto {
  @IsEnum(Role)
  role!: Role;
}
