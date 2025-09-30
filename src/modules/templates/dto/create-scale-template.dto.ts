import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class FunctionRequirementDto {
  @IsMongoId()
  functionId: string;

  @IsNumber()
  @Min(0)
  requiredSlots: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}

export class CreateScaleTemplateDto {
  @IsMongoId()
  ministryId: string; // ministério ao qual este template pertence

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FunctionRequirementDto)
  functionRequirements: FunctionRequirementDto[];

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;

  @IsOptional()
  @IsBoolean()
  allowOverbooking?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reminderDaysBefore?: number;
}


