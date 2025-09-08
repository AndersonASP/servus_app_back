import { MembershipRole } from '../../../common/enums/role.enum';

export class AddressResponseDto {
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

export class BranchBasicDto {
  id: string;
  name: string;
  address?: string;
}

export class MinistryBasicDto {
  id: string;
  name: string;
  description?: string;
}

export class MembershipResponseDto {
  id: string;
  role: MembershipRole;
  isActive: boolean;
  branch?: BranchBasicDto;
  ministry?: MinistryBasicDto;
  createdAt: Date;
  updatedAt: Date;
}

export class MemberResponseDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  bio?: string;
  skills?: string[];
  availability?: string;
  address?: AddressResponseDto;
  picture?: string;
  isActive: boolean;
  profileCompleted: boolean;
  role: string; // Role global
  tenantId?: string;
  branchId?: string;
  memberships: MembershipResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
