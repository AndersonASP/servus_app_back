import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetRecurrencesDto {
  @IsOptional()
  @IsString()
  month?: string; // formato: YYYY-MM (ex: 2024-01)

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Transform(({ value }) => parseInt(value))
  monthNumber?: number; // 1-12

  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2030)
  @Transform(({ value }) => parseInt(value))
  year?: number; // 2020-2030

  @IsOptional()
  @IsString()
  ministryId?: string; // filtrar por ministério específico

  @IsOptional()
  @IsString()
  status?: string; // filtrar por status das instâncias
}
