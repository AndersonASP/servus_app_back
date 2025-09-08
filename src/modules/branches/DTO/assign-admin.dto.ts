import { IsString, IsEmail, IsOptional } from 'class-validator';

export class AssignAdminDto {
  @IsOptional()
  @IsString()
  userId?: string; // ID do usuário existente para vincular

  @IsOptional()
  @IsEmail()
  userEmail?: string; // Email do usuário existente para vincular

  @IsOptional()
  @IsString()
  name?: string; // Nome do novo administrador

  @IsOptional()
  @IsEmail()
  email?: string; // Email do novo administrador

  @IsOptional()
  @IsString()
  password?: string; // Senha do novo administrador (opcional, será gerada se não fornecida)
}
