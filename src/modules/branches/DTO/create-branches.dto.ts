import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEmail
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContextValidationDto } from 'src/common/dto/context-validation.dto';

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

export class CreateBranchDto extends ContextValidationDto {
  @ApiProperty()
  @IsString()
  name: string;

  // branchId vem do contexto (path param ou header)

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested() @Type(() => EnderecoDto)
  @IsOptional()
  endereco?: EnderecoDto;

  @IsOptional() @IsString()
  telefone?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  whatsappOficial?: string;

  // tenant vem do contexto (path param ou header)

  @IsOptional() @IsString()
  responsavel?: string;

  @ValidateNested({ each: true }) @Type(() => DiaCultoDto)
  @IsOptional()
  diasCulto?: DiaCultoDto[];

  @ValidateNested({ each: true }) @Type(() => EventoPadraoDto)
  @IsOptional()
  eventosPadrao?: EventoPadraoDto[];

  @IsOptional() @IsArray()
  modulosAtivos?: string[];

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsString()
  corTema?: string;

  @IsOptional() @IsString()
  idioma?: string;

  @IsOptional() @IsString()
  timezone?: string;
}