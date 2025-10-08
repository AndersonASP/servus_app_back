import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum ServiceHistoryStatus {
  COMPLETED = 'completed',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
  REPLACED = 'replaced',
}

export class CreateServiceHistoryDto {
  @IsString()
  userId: string;

  @IsString()
  scaleId: string;

  @IsString()
  functionId: string;

  @IsString()
  ministryId: string;

  @IsDateString()
  serviceDate: string;

  @IsEnum(ServiceHistoryStatus)
  @IsOptional()
  status?: ServiceHistoryStatus = ServiceHistoryStatus.COMPLETED;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  originalUserId?: string; // Para substituições

  @IsString()
  @IsOptional()
  substitutionRequestId?: string;
}

export class UpdateServiceHistoryDto {
  @IsEnum(ServiceHistoryStatus)
  @IsOptional()
  status?: ServiceHistoryStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ListServiceHistoryDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  ministryId?: string;

  @IsString()
  @IsOptional()
  scaleId?: string;

  @IsEnum(ServiceHistoryStatus)
  @IsOptional()
  status?: ServiceHistoryStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
