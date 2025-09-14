import { IsEmail, IsOptional, IsString, IsMongoId } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  role?: string;

  // 🔹 Só será usado pelo SuperAdmin no controller (e validado lá)
  @IsOptional()
  @IsMongoId()
  tenantId?: string; // ObjectId como string

  // 🔹 Só será usado se for admin da matriz ou superadmin
  @IsOptional()
  @IsString()
  branchId?: string;
}
