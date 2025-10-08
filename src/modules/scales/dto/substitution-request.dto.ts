import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum SubstitutionRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export class CreateSubstitutionRequestDto {
  @IsString()
  scaleId: string;

  @IsString()
  targetId: string; // Voluntário B (quem recebe a solicitação)

  @IsString()
  reason: string;
}

export class RespondToSubstitutionRequestDto {
  @IsEnum(SubstitutionRequestStatus)
  response: SubstitutionRequestStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class ListSubstitutionRequestDto {
  @IsString()
  @IsOptional()
  scaleId?: string;

  @IsString()
  @IsOptional()
  requesterId?: string;

  @IsString()
  @IsOptional()
  targetId?: string;

  @IsEnum(SubstitutionRequestStatus)
  @IsOptional()
  status?: SubstitutionRequestStatus;

  @IsString()
  @IsOptional()
  ministryId?: string;
}
