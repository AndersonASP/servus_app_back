import { IsOptional, IsString, IsBoolean, IsArray, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class EnderecoDto {
  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  rua?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  complemento?: string;
}

export class DiaCultoDto {
  @IsString()
  dia: string;

  @IsArray()
  @IsString({ each: true })
  horarios: string[];
}

export class EventoPadraoDto {
  @IsString()
  nome: string;

  @IsString()
  dia: string;

  @IsArray()
  @IsString({ each: true })
  horarios: string[];

  @IsOptional()
  @IsString()
  tipo?: string;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnderecoDto)
  endereco?: EnderecoDto;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  whatsappOficial?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiaCultoDto)
  diasCulto?: DiaCultoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventoPadraoDto)
  eventosPadrao?: EventoPadraoDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modulosAtivos?: string[];

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  corTema?: string;

  @IsOptional()
  @IsString()
  idioma?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
