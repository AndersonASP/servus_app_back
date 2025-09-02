import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Role } from 'src/common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  password?: string | null;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  role?: Role;

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsString()
  picture?: string;

  // 🔹 Só será usado pelo SuperAdmin no controller (e validado lá)
  @IsOptional()
  @IsString()
  tenantId?: string;

  // 🔹 Só será usado se for admin da matriz ou superadmin
  @IsOptional()
  @IsString()
  branchId?: string;
}