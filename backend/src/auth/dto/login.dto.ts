import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Signing in takes an email and a password and nothing else: accounts are
 * created by the CEO or a manager, so the tenant is found from the account.
 */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
