import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateInviteCodeDto {
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}

export class ValidateInviteCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class RegisterWithInviteDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class InviteCodeResponseDto {
  code: string;
  ministryId: string;
  ministryName: string;
  tenantId: string;
  branchId?: string;
  branchName?: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  usageCount: number;
  isActive: boolean;
}

export class InviteCodeValidationDto {
  isValid: boolean;
  ministryId?: string;
  ministryName?: string;
  tenantId?: string;
  branchId?: string;
  branchName?: string;
  expiresAt?: Date;
  message?: string;
}
