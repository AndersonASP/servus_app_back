import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { MembershipRole } from 'src/common/enums/role.enum';

export class CreateInvitationDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  tenantId: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  ministryId?: string;

  @IsEnum(MembershipRole)
  @IsNotEmpty()
  role: MembershipRole; // Sempre Volunteer para auto-registro

  @IsOptional()
  @IsString()
  message?: string; // Mensagem personalizada do convite

  @IsOptional()
  @IsString()
  expiresAt?: string; // Data de expiração do convite

  @IsOptional()
  @IsString()
  invitedBy?: string; // Email de quem enviou o convite
}
