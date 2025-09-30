import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class ListScaleTemplateDto {
  @IsOptional()
  @IsMongoId()
  tenantId?: string;

  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsMongoId()
  ministryId?: string; // para filtrar por ministério

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}


