import { IsEmail, IsOptional, IsString, IsEnum, IsDateString, IsArray, ValidateNested, IsBoolean, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { MembershipRole } from '../../../common/enums/role.enum';

export class AddressDto {
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
}

export class MembershipAssignmentDto {
  @IsEnum(MembershipRole)
  role: MembershipRole;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  ministryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MembershipAssignmentDto)
  memberships: MembershipAssignmentDto[];

  @IsOptional()
  @IsString()
  password?: string;
}