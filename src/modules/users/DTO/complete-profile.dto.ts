import { IsString, IsOptional, IsNotEmpty, IsDateString } from 'class-validator';

export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
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

  @IsOptional()
  @IsString()
  bio?: string; // Breve descrição sobre o usuário

  @IsOptional()
  @IsString()
  skills?: string[]; // Habilidades/competências

  @IsOptional()
  @IsString()
  availability?: string; // Disponibilidade para servir
} 