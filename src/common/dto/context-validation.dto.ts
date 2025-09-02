import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class ContextValidationDto {
  @IsOptional()
  @ValidateIf((o) => false) // Sempre rejeita
  @IsString()
  tenantId?: string;

  @IsOptional()
  @ValidateIf((o) => false) // Sempre rejeita
  @IsString()
  branchId?: string;

  @IsOptional()
  @ValidateIf((o) => false) // Sempre rejeita
  @IsString()
  ministryId?: string;
} 