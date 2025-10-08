import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { MembershipRole } from '../../../common/enums/role.enum';

export class MemberFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // Busca por nome ou email

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  page?: string = '1';

  @IsOptional()
  @IsString()
  limit?: string = '10';
}
