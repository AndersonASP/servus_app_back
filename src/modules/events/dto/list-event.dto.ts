import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class ListEventDto {
  @IsOptional()
  @IsMongoId()
  tenantId?: string;

  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsMongoId()
  ministryId?: string;

  @IsOptional()
  @IsEnum(['draft', 'published', 'completed', 'cancelled'])
  status?: 'draft' | 'published' | 'completed' | 'cancelled';

  @IsOptional()
  @IsEnum(['none', 'daily', 'weekly', 'monthly'])
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @IsEnum(['ordinary', 'ministry_specific'])
  eventType?: 'ordinary' | 'ministry_specific';

  @IsOptional()
  @IsBoolean()
  isOrdinary?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
