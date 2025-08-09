import { Role } from '../../enums/role.enum';

interface UserToken {
  role: Role;
  tenantId?: string;
  branchId?: string;
}

interface ScopeInput {
  dtoTenantId?: string;
  dtoBranchId?: string;
}

export function resolveTenantAndBranchScope(
  user: UserToken,
  input: ScopeInput = {},
) {
  const isSuperAdmin = user.role === Role.SuperAdmin;

  const tenantId = isSuperAdmin
    ? input.dtoTenantId
    : user.tenantId;

  let branchId: string | undefined;

  if (isSuperAdmin) {
    branchId = input.dtoBranchId;
  } else if (user.role === Role.Admin) {
    // Admin de filial só pode criar para sua própria filial
    branchId = user.branchId ?? input.dtoBranchId;
  } else if (user.role === Role.Leader) {
    // Líder só pode criar voluntários na sua própria filial
    branchId = user.branchId;
  }

  return { tenantId, branchId };
}