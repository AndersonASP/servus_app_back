import { Role } from '../enums/role.enum';

interface UserInfo {
  role: Role;
  tenantId: string;
  branchId?: string;
}

export function hasPermission(
  user: UserInfo,
  allowedRoles: Role[],
  targetTenantId?: string,
  targetBranchId?: string
): boolean {
  if (!user?.role) return false;

  // ✅ SuperAdmin acessa tudo
  if (user.role === Role.SuperAdmin) return true;

  // ✅ Se a rota exige apenas SuperAdmin, bloquear os outros
  if (allowedRoles.length === 1 && allowedRoles[0] === Role.SuperAdmin) {
    return false;
  }

  // ✅ Bloquear se estiver acessando outro tenant
  if (targetTenantId && user.tenantId !== targetTenantId) {
    return false;
  }

  // ✅ Admin da matriz: acessa tudo dentro do tenant
  if (user.role === Role.Admin && !user.branchId) {
    return true;
  }

  // ✅ Admin da filial: acessa somente sua filial
  if (user.role === Role.Admin && user.branchId) {
    return !targetBranchId || targetBranchId === user.branchId;
  }

  // ✅ Leader da matriz: acessa leader/volunteer do tenant
  if (user.role === Role.Leader && !user.branchId) {
    return allowedRoles.includes(Role.Leader) || allowedRoles.includes(Role.Volunteer);
  }

  // ✅ Leader da filial: acessa apenas leader/volunteer da própria filial
  if (user.role === Role.Leader && user.branchId) {
    return (
      (!targetBranchId || targetBranchId === user.branchId) &&
      (allowedRoles.includes(Role.Leader) || allowedRoles.includes(Role.Volunteer))
    );
  }

  // ✅ Volunteer da matriz
  if (user.role === Role.Volunteer && !user.branchId) {
    return allowedRoles.includes(Role.Volunteer);
  }

  // ✅ Volunteer da filial
  if (user.role === Role.Volunteer && user.branchId) {
    return (
      (!targetBranchId || targetBranchId === user.branchId) &&
      allowedRoles.includes(Role.Volunteer)
    );
  }

  return false;
}