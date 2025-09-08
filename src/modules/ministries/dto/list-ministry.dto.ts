import { Type, Transform } from 'class-transformer';
import {
  IsBooleanString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ListMinistryDto {
  @IsOptional()
  @IsString()
  search?: string; // busca por nome/slug

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    if (typeof value === 'boolean') {
      return value;
    }
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean; // aceita 'true'/'false' ou true/false

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
