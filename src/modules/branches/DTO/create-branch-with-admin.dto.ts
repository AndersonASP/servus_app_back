import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { CreateBranchDto } from './create-branches.dto';
import { CreateUserDto } from '../../users/DTO/create-user.dto';

export class CreateBranchWithAdminDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CreateBranchDto)
  branchData: CreateBranchDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateUserDto)
  adminData?: CreateUserDto;
} 