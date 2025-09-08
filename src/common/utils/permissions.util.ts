import { MembershipRole, Role } from '../enums/role.enum';

// Mapeamento de permissões por role global
const GLOBAL_ROLE_PERMISSIONS = {
  [Role.ServusAdmin]: [
    'manage_all_tenants',
    'manage_all_users',
    'manage_system_settings',
    'view_analytics',
    'manage_billing',
  ],

  [Role.Volunteer]: ['view_own_profile'],
};

// Mapeamento de permissões por role de membership
const MEMBERSHIP_ROLE_PERMISSIONS = {
  [MembershipRole.TenantAdmin]: [
    'manage_tenant',
    'manage_branches',
    'manage_ministries',
    'manage_users',
    'manage_events',
    'manage_schedules',
    'view_reports',
    'manage_volunteers',
  ],

  [MembershipRole.BranchAdmin]: [
    'manage_branch',
    'manage_branch_ministries',
    'manage_branch_users',
    'manage_branch_events',
    'manage_branch_schedules',
    'view_branch_reports',
    'manage_branch_volunteers',
  ],

  [MembershipRole.Leader]: [
    'manage_ministry',
    'manage_ministry_volunteers',
    'manage_ministry_events',
    'view_ministry_reports',
  ],

  [MembershipRole.Volunteer]: [
    'view_events',
    'join_events',
    'view_schedules',
    'update_own_availability',
  ],
};

// Gera lista de permissões para um role específico
export function getPermissionsForRole(role: MembershipRole | Role): string[] {
  if (Object.values(Role).includes(role as Role)) {
    return GLOBAL_ROLE_PERMISSIONS[role as Role] || [];
  }

  if (Object.values(MembershipRole).includes(role as MembershipRole)) {
    return MEMBERSHIP_ROLE_PERMISSIONS[role as MembershipRole] || [];
  }

  return [];
}

// Combina permissões de role global + membership role
export function getCombinedPermissions(
  globalRole: Role | string,
  membershipRole?: MembershipRole,
): string[] {
  const globalPermissions = getPermissionsForRole(globalRole as Role);

  if (!membershipRole) {
    return globalPermissions;
  }

  const membershipPermissions = getPermissionsForRole(membershipRole);

  // Remove duplicatas e combina
  return [...new Set([...globalPermissions, ...membershipPermissions])];
}

// Verifica se um usuário tem uma permissão específica
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
): boolean {
  return (
    userPermissions.includes(requiredPermission) ||
    userPermissions.includes('manage_all_tenants')
  ); // ServusAdmin bypass
}
