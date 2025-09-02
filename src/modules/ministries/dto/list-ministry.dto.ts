import { Type } from 'class-transformer';
import { IsBooleanString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ListMinistryDto {
  @IsOptional()
  @IsString()
  search?: string; // busca por nome/slug

  @IsOptional()
  @IsBooleanString()
  isActive?: string; // 'true' | 'false'

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}