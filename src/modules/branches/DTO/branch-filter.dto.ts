import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class BranchFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // Busca por nome ou descrição

  @IsOptional()
  @IsString()
  cidade?: string; // Filtrar por cidade

  @IsOptional()
  @IsString()
  estado?: string; // Filtrar por estado

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // Filtrar por status ativo/inativo

  @IsOptional()
  @IsString()
  page?: string = '1'; // Página para paginação

  @IsOptional()
  @IsString()
  limit?: string = '10'; // Limite de itens por página

  @IsOptional()
  @IsString()
  sortBy?: string = 'name'; // Campo para ordenação

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc'; // Ordem da ordenação
}
