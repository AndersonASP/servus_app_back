import { ApiProperty } from '@nestjs/swagger';

export class EnderecoResponseDto {
  @ApiProperty({ required: false })
  cep?: string;

  @ApiProperty({ required: false })
  rua?: string;

  @ApiProperty({ required: false })
  numero?: string;

  @ApiProperty({ required: false })
  bairro?: string;

  @ApiProperty({ required: false })
  cidade?: string;

  @ApiProperty({ required: false })
  estado?: string;

  @ApiProperty({ required: false })
  complemento?: string;
}

export class DiaCultoResponseDto {
  @ApiProperty()
  dia: string;

  @ApiProperty({ type: [String] })
  horarios: string[];
}

export class EventoPadraoResponseDto {
  @ApiProperty()
  nome: string;

  @ApiProperty()
  dia: string;

  @ApiProperty({ type: [String] })
  horarios: string[];

  @ApiProperty({ required: false })
  tipo?: string;
}

export class BranchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ type: EnderecoResponseDto, required: false })
  endereco?: EnderecoResponseDto;

  @ApiProperty({ required: false })
  telefone?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  whatsappOficial?: string;

  @ApiProperty({ type: [DiaCultoResponseDto], required: false })
  diasCulto?: DiaCultoResponseDto[];

  @ApiProperty({ type: [EventoPadraoResponseDto], required: false })
  eventosPadrao?: EventoPadraoResponseDto[];

  @ApiProperty({ type: [String], required: false })
  modulosAtivos?: string[];

  @ApiProperty({ required: false })
  logoUrl?: string;

  @ApiProperty({ required: false })
  corTema?: string;

  @ApiProperty({ required: false })
  idioma?: string;

  @ApiProperty({ required: false })
  timezone?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BranchListResponseDto {
  @ApiProperty({ type: [BranchResponseDto] })
  branches: BranchResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
