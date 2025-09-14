import { Role } from '../../enums/role.enum';

interface UserToken {
  role: Role; // global: 'servus_admin' | 'volunteer'
  tenantId?: string; // ObjectId como string, obrigatório para não-superadmin
  branchId?: string; // presente para escopo de filial (branch admin / líder)
}

interface ScopeInput {
  dtoTenantId?: string;
  dtoBranchId?: string;
}

export function resolveTenantAndBranchScope(
  user: UserToken,
  input: ScopeInput = {},
) {
  const isSuperAdmin = user.role === Role.ServusAdmin;

  // Tenant
  const tenantId = isSuperAdmin
    ? (input.dtoTenantId ?? user.tenantId)
    : user.tenantId;
  if (!isSuperAdmin && !tenantId) {
    throw new Error('tenantId ausente no token do usuário.');
  }

  // Branch
  // - Se o token já traz branchId (usuário branch-scoped), força essa branch.
  // - Senão, permite usar dtoBranchId (ex.: tenant admin escolhendo a filial).
  const branchId = isSuperAdmin
    ? input.dtoBranchId
    : (user.branchId ?? input.dtoBranchId);

  return { tenantId, branchId };
}
