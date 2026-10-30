import { AppKey, Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * One-shot invite: creates a user, adds them to the roster and grants a per-
 * app role in a single call.
 *
 * Separate from `CreateTeamMemberDto` (which attaches an EXISTING user to the
 * roster) because the admin flow needs to create the account inline rather
 * than hop through a sign-up link.
 */
export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  /** Plain password — hashed by the service. */
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  /** Base role across the organization. */
  @IsEnum(Role)
  role!: Role;

  /**
   * The team (= AXA app) the person joins. Optional: when omitted the member
   * gets a membership with no `AppOwnership` row and uses the base `role`
   * wherever permissions are checked.
   */
  @IsOptional()
  @IsEnum(AppKey)
  team?: AppKey;
}
