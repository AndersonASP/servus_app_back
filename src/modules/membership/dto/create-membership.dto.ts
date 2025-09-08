import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { MembershipRole } from 'src/common/enums/role.enum';

export class CreateMembershipDto {
  @IsString()
  userId: string; // ID do usuário a ser vinculado

  @IsOptional()
  @IsString()
  branchId?: string; // ID da filial (opcional para matriz)

  @IsEnum(MembershipRole)
  role: MembershipRole; // Role no ministério

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // Status do vínculo (padrão: true)
}
