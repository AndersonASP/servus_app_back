import { Role } from 'src/common/enums/role.enum';

interface UserToken {
  role: Role;
  tenantId: string;
  branchId?: string;
}

interface UserQueryFilters {
  role?: string;
  tenantId?: string;
  branchId?: string;
}

export function buildUserFiltersFromScope(
  user: UserToken,
  query: UserQueryFilters = {},
) {
  const filters: any = {};

  switch (user.role) {
    case Role.SuperAdmin:
      // Pode filtrar qualquer tenant ou branch se informado
      if (query.tenantId) filters.tenantId = query.tenantId;
      if (query.branchId) filters.branchId = query.branchId;
      break;

    case Role.Admin:
      // Sempre força tenant do token
      filters.tenantId = user.tenantId;

      // Pode filtrar por branch dentro do próprio tenant
      if (query.branchId) filters.branchId = query.branchId;
      break;

    case Role.Leader:
      // Sempre força tenant e branch do token
      filters.tenantId = user.tenantId;
      filters.branchId = user.branchId;
      filters.role = Role.Volunteer; // Líder só pode ver voluntários
      break;
  }

  // Filtro por role (apenas se permitido)
  if (query.role) {
    const canFilterByRole = [Role.SuperAdmin, Role.Admin].includes(user.role);
    if (canFilterByRole) {
      filters.role = query.role;
    }
  }

  return filters;
}