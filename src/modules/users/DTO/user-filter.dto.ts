import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumberString,
  IsBoolean,
} from 'class-validator';
import { Role } from 'src/common/enums/role.enum';

export class UserFilterDto {
  @IsOptional()
  @IsEnum(Role, {
    message: `Role deve ser um dos seguintes valores: ${Object.values(Role).join(', ')}`,
  })
  role?: Role;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'page deve ser um número válido' })
  page?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'limit deve ser um número válido' })
  limit?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;
}
// Fixed import issue
