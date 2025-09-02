import { IsEmail, IsString, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';

export class SelfRegistrationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  invitationToken: string; // Token único do convite

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  address?: {
    cep?: string;
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  };
} 