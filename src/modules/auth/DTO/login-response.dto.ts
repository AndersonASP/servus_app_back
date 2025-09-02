import { MembershipRole } from 'src/common/enums/role.enum';

// DTO para informações básicas de entidades
export class TenantBasicDto {
  id: string;          // MongoDB _id
  tenantId: string;    // Slug público
  name: string;
  logoUrl?: string;
}

export class BranchBasicDto {
  id: string;          // MongoDB _id  
  branchId: string;    // Slug público
  name: string;
}

export class MinistryBasicDto {
  id: string;          // MongoDB _id
  name: string;
}

// DTO para membership no contexto atual
export class CurrentMembershipDto {
  id: string;
  role: MembershipRole;
  permissions: string[];  // Lista de permissões derivadas do role
  branch?: BranchBasicDto;
  ministry?: MinistryBasicDto;
}

// DTO do usuário básico
export class UserBasicDto {
  id: string;
  email: string;
  name: string;
  role: string;        // Role global (servus_admin, volunteer)
  picture?: string;    // Só inclui se existir
}

// DTO de resposta do login (leve)
export class LoginResponseDto {
  access_token: string;
  refresh_token: string;
  token_type: string;   // "Bearer"
  expires_in: number;   // Segundos até expirar
  user: UserBasicDto;
  
  // Contexto atual (apenas se tenant foi especificado)
  tenant?: TenantBasicDto;
  branches?: BranchBasicDto[];        // Branches disponíveis no tenant atual
  memberships?: CurrentMembershipDto[]; // Memberships no tenant atual
}

// DTO para o endpoint de contexto completo
export class UserContextDto {
  tenants: {
    id: string;
    tenantId: string;
    name: string;
    logoUrl?: string;
    memberships: {
      id: string;
      role: MembershipRole;
      permissions: string[];
      branch?: BranchBasicDto;
      ministry?: MinistryBasicDto;
    }[];
    branches: BranchBasicDto[];
  }[];
} 