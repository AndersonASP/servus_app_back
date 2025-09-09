import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { CreateTenantDto } from './create-tenant.dto';
import { CreateUserDto } from '../../users/dto/create-user.dto';

export class CreateTenantWithAdminDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CreateTenantDto)
  tenantData: CreateTenantDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateUserDto)
  adminData?: CreateUserDto;
}
