import { AppKey, Role } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Approves a request by provisioning an internal user account for the
 * requester — not an external customer. The CEO fills these fields from the
 * UI; the service hashes the password and creates the roster rows atomically.
 */
export class ProvisionRequestDto {
  /** Plain password. Hashed by the service before it hits the database. */
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  /** The person's base role across the organization. */
  @IsEnum(Role)
  role!: Role;

  /**
   * The team (= AXA app) the person leads or contributes to.
   *
   * Optional: when omitted the service falls back to the app on the request
   * so the "team" field in the UI can be left alone when it already matches.
   */
  @IsOptional()
  @IsEnum(AppKey)
  team?: AppKey;

  /** Note stored on the request after the decision. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decisionNote?: string;

  /**
   * Optional display name override. Defaults to the request's `requesterName`.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}
