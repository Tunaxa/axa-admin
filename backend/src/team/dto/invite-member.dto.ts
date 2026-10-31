import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * One-shot invite: creates a user and puts them on a department's team in a
 * single call, so the account can exist before the person has ever signed in.
 */
export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  /** Plain password; hashed by the service. */
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  /** developer, designer or viewer: managers are created from Departments. */
  @IsEnum(Role)
  role!: Role;

  /**
   * The department to join. The CEO has to say; a manager's own is implied and
   * anything else is refused.
   */
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
