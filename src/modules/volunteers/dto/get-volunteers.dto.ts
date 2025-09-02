import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetVolunteersDto {
  @IsOptional() @IsString() branchId?: string;     // ObjectId da Branch (string)
  @IsOptional() @IsString() ministryId?: string;   // ObjectId do Ministry
  @IsOptional() @IsString() search?: string;       // nome/email (regex)

  @Type(() => Number) @IsInt() @Min(1)
  @IsOptional() page: number = 1;

  @Type(() => Number) @IsInt() @Min(1)
  @IsOptional() pageSize: number = 20;

  @IsOptional() @IsString() sort: string = 'name:asc'; // futuro: name:desc etc.
}