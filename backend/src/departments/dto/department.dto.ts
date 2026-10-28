import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** A brand-new account for the person who will run a department. */
export class ManagerAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  /** Plain password; hashed by the service. */
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Create the manager together with the department. */
  @IsOptional()
  @ValidateNested()
  @Type(() => ManagerAccountDto)
  manager?: ManagerAccountDto;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/**
 * Names the department's manager: either a new account, or somebody who
 * already sits in the department.
 */
export class SetManagerDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ManagerAccountDto)
  account?: ManagerAccountDto;
}
