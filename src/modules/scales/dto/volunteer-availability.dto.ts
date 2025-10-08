import {
  IsString,
  IsDateString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BlockedDateDto {
  @IsDateString()
  date: string;

  @IsString()
  reason: string;

  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean = true;
}

export class CreateVolunteerAvailabilityDto {
  @IsString()
  userId: string;

  @IsString()
  ministryId: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockedDateDto)
  @IsOptional()
  blockedDates?: BlockedDateDto[];

  @IsNumber()
  @IsOptional()
  maxBlockedDaysPerMonth?: number = 30;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateVolunteerAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockedDateDto)
  @IsOptional()
  blockedDates?: BlockedDateDto[];

  @IsNumber()
  @IsOptional()
  maxBlockedDaysPerMonth?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ListVolunteerAvailabilityDto {
  @IsString()
  @IsOptional()
  ministryId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
