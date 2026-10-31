import { Role } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** The roles an account can be created with from a request. */
export const PROVISION_ROLES = ['developer', 'designer', 'viewer'] as const;

/**
 * Approves a request by creating an internal account for the requester.
 *
 * The CEO fills these in from the UI; the service hashes the password and
 * creates the account and its place on a department's team in one transaction.
 */
export class ProvisionRequestDto {
  /** Plain password; hashed by the service. */
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsEnum(Role)
  @IsIn(PROVISION_ROLES)
  role!: Role;

  /** The department the new person joins. */
  @IsUUID()
  departmentId!: string;

  /** Note stored on the request after the decision. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decisionNote?: string;

  /** Display name override. Defaults to the request's `requesterName`. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}
