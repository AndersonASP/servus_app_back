import { IsArray, IsString, IsOptional, ArrayNotEmpty } from 'class-validator';

export class BulkUpsertFunctionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  names: string[]; // Nomes das funções digitadas pelo usuário

  @IsOptional()
  @IsString()
  category?: string; // Categoria opcional para todas as funções

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // Tags opcionais
}
