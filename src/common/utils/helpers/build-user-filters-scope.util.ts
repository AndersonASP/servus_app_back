import { Role } from 'src/common/enums/role.enum';

interface UserToken {
  role: Role; // global: 'servus_admin' | 'volunteer'
  tenantId: string;
  branchId?: string; // presente para branch-scoped (ex.: branch admin / líder)
}

interface UserQueryFilters {
  role?: string;
  tenantId?: string;
  branchId?: string;
  isActive?: boolean;
  search?: string;
}

interface BuildFiltersOptions {
  /** Quando true, força listar apenas voluntários (ex.: líder) */
  isLeader?: boolean;
}

/**
 * Constrói filtros de listagem respeitando o escopo do usuário.
 * - ServusAdmin: livre para filtrar tenant/branch/role.
 * - Demais: força tenantId do token; se tiver branchId no token, força a mesma branch.
 *   Se não tiver branchId (tenant admin), aceita branchId do query.
 * - Se opts.isLeader === true, restringe a role=volunteer.
 */
export function buildUserFiltersFromScope(
  user: UserToken,
  query: UserQueryFilters = {},
  opts: BuildFiltersOptions = {},
) {
  const filters: Record<string, any> = {};

  // 🟣 Superadmin: pode tudo
  if (user.role === Role.ServusAdmin) {
    if (query.tenantId) filters.tenantId = query.tenantId;
    if (query.branchId) filters.branchId = query.branchId;
    if (query.role) filters.role = query.role;
    if (query.isActive !== undefined) filters.isActive = query.isActive;
    return filters;
  }

  // 🔵 Qualquer outro usuário: força tenant do token
  filters.tenantId = user.tenantId;

  // Se o token tem branchId (branch-scoped: líder / branch admin), força essa branch
  if (user.branchId) {
    filters.branchId = user.branchId;
  } else {
    // Sem branch no token (ex.: tenant admin) → pode filtrar por branch informada
    if (query.branchId) {
      filters.branchId = query.branchId;
    }
  }

  // (Opcional) Se o chamador é líder nesse escopo → só vê voluntários
  if (opts.isLeader) {
    filters.role = Role.Volunteer;
  } else if (query.role) {
    // Apenas SuperAdmin deveria filtrar por role arbitrária.
    // Se você quiser permitir TenantAdmin escolher role, descomente a linha abaixo:
    // filters.role = query.role;
  }

  // ✅ CORREÇÃO: Aplicar filtro isActive para todos os usuários
  if (query.isActive !== undefined) {
    filters.isActive = query.isActive;
  }

  return filters;
}
