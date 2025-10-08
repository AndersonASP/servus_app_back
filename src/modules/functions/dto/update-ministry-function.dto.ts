import {
  IsOptional,
  IsBoolean,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class UpdateMinistryFunctionDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultSlots?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
