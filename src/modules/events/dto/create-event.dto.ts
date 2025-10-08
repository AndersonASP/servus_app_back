import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsNumber,
  Min,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecurrencePatternDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  daysOfWeek?: number[]; // 0-6

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  dayOfMonth?: number; // 1-31

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  occurrences?: number;
}

export class CreateEventDto {
  @IsOptional()
  @IsMongoId()
  ministryId?: string; // Opcional para eventos globais

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsDateString()
  eventDate: string;

  @IsString()
  @IsNotEmpty()
  eventTime: string; // HH:mm

  @IsEnum(['none', 'daily', 'weekly', 'monthly'])
  recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrencePatternDto)
  recurrencePattern?: RecurrencePatternDto;

  @IsEnum(['global', 'ministry_specific'])
  eventType: 'global' | 'ministry_specific';

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialNotes?: string;
}
