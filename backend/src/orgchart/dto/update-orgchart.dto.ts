import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrgChartDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsObject()
  data!: Record<string, unknown>;
}
