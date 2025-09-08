import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { MembershipRole } from 'src/common/enums/role.enum';

export class UpdateMembershipDto {
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole; // Nova role no ministério

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // Novo status do vínculo
}
