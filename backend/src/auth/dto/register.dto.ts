import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  /**
   * The tenant the user belongs to.
   *
   * Passed explicitly for now. Resolving the tenant implicitly — from the
   * request host, from configuration, or from the single existing
   * organization — belongs to the tenant-context work.
   */
  @IsUUID()
  organizationId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}
