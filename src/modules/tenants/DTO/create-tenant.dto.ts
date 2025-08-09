import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEmail,
  IsNumber,
  IsEnum,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';

class EnderecoDto {
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() rua?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() complemento?: string;
}

class DiaCultoDto {
  @IsString() dia: string;
  @IsArray() horarios: string[];
}

class EventoPadraoDto {
  @IsString() nome: string;
  @IsString() dia: string;
  @IsArray() horarios: string[];
  @IsOptional() @IsString() tipo?: string;
}

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  name: string;

  @IsOptional() @IsString()
  tenantId?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  cnpj?: string;

  @IsOptional() @IsString()
  inscricaoEstadual?: string;

  @IsOptional() @IsString()
  inscricaoMunicipal?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  telefone?: string;

  @IsOptional() @IsString()
  site?: string;

  @ValidateNested() @Type(() => EnderecoDto)
  @IsOptional()
  endereco?: EnderecoDto;

  @IsOptional() @IsEnum(['basic', 'pro', 'enterprise'])
  plan?: string;

  @IsOptional() @IsNumber()
  maxBranches?: number;

  @IsOptional() @IsDateString()
  planoAtivoDesde?: Date;

  @IsOptional() @IsDateString()
  planoExpiraEm?: Date;

  @IsOptional() @IsEnum(['ativo', 'pendente', 'inadimplente'])
  statusPagamento?: string;

  @IsOptional() @IsEnum(['cartao', 'boleto', 'pix'])
  formaPagamentoPreferida?: string;

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsString()
  corTema?: string;

  @IsOptional() @IsString()
  idioma?: string;

  @IsOptional() @IsString()
  timezone?: string;

  @ValidateNested({ each: true }) @Type(() => DiaCultoDto)
  @IsOptional()
  diasCulto?: DiaCultoDto[];

  @ValidateNested({ each: true }) @Type(() => EventoPadraoDto)
  @IsOptional()
  eventosPadrao?: EventoPadraoDto[];

  @IsOptional() @IsString()
  canalComunicacaoPreferido?: string;

  @IsOptional() @IsString()
  whatsappOficial?: string;

  @IsOptional() @IsEmail()
  emailFinanceiro?: string;

  @IsOptional() @IsEmail()
  emailSuporte?: string;

  @IsOptional() @IsNumber()
  limiteUsuarios?: number;

  @IsOptional() @IsNumber()
  limiteArmazenamento?: number;

  @IsOptional() @IsDateString()
  ultimoAcesso?: Date;

  @IsOptional() @IsString()
  notasInternas?: string;
}