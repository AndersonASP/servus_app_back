import {
  IsString,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScaleAssignmentDto {
  @IsString()
  functionId: string;

  @IsString()
  functionName: string;

  @IsInt()
  @Min(1)
  requiredSlots: number;

  @IsOptional()
  @IsArray()
  assignedMembers?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class CreateScaleDto {
  @IsString()
  eventId: string;

  @IsString()
  ministryId: string;

  @IsString()
  templateId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  eventDate: string;

  @IsString()
  eventTime: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScaleAssignmentDto)
  assignments?: CreateScaleAssignmentDto[];

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;

  @IsOptional()
  @IsBoolean()
  allowOverbooking?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  reminderDaysBefore?: number;

  @IsOptional()
  @IsString()
  specialNotes?: string;
}

export class UpdateScaleDto extends CreateScaleDto {
  @IsOptional()
  @IsEnum(['draft', 'published', 'completed', 'cancelled'])
  status?: 'draft' | 'published' | 'completed' | 'cancelled';
}

export class ListScaleDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsEnum(['draft', 'published', 'completed', 'cancelled'])
  status?: 'draft' | 'published' | 'completed' | 'cancelled';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
