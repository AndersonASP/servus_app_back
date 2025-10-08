import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class CreateMinistrySettingsDto {
  @IsString()
  ministryId: string;

  @IsNumber()
  @IsOptional()
  maxBlockedDaysPerMonth?: number = 30;

  @IsNumber()
  @IsOptional()
  advanceNoticeDays?: number = 7;

  @IsBoolean()
  @IsOptional()
  autoGenerateScales?: boolean = true;

  @IsNumber()
  @IsOptional()
  reminderDaysBefore?: number = 2;

  @IsBoolean()
  @IsOptional()
  allowSelfSubstitution?: boolean = true;

  @IsBoolean()
  @IsOptional()
  requireLeaderApproval?: boolean = true;

  @IsNumber()
  @IsOptional()
  swapRequestExpiryHours?: number = 24;

  @IsNumber()
  @IsOptional()
  maxSwapRequestsPerMonth?: number = 3;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateMinistrySettingsDto {
  @IsNumber()
  @IsOptional()
  maxBlockedDaysPerMonth?: number;

  @IsNumber()
  @IsOptional()
  advanceNoticeDays?: number;

  @IsBoolean()
  @IsOptional()
  autoGenerateScales?: boolean;

  @IsNumber()
  @IsOptional()
  reminderDaysBefore?: number;

  @IsBoolean()
  @IsOptional()
  allowSelfSubstitution?: boolean;

  @IsBoolean()
  @IsOptional()
  requireLeaderApproval?: boolean;

  @IsNumber()
  @IsOptional()
  swapRequestExpiryHours?: number;

  @IsNumber()
  @IsOptional()
  maxSwapRequestsPerMonth?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
