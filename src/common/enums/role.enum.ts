// Papel global do usuário (fora do escopo de tenants/branches)
export enum Role {
  ServusAdmin = 'servus_admin',
  TenantAdmin = 'tenant_admin',
  BranchAdmin = 'branch_admin',
  Volunteer = 'volunteer', // default
}

// Papel no escopo (Membership)
export enum MembershipRole {
  TenantAdmin = 'tenant_admin',
  BranchAdmin = 'branch_admin',
  Leader = 'leader',
  Volunteer = 'volunteer',
}

// Permissões atômicas
export const PERMS = {
  // Permissões globais (ServusAdmin)
  MANAGE_ALL_TENANTS: 'manage_all_tenants',

  // Permissões de tenant
  MANAGE_TENANT: 'manage_tenant',
  MANAGE_TENANT_MINISTRIES: 'manage_tenant_ministries',
  MANAGE_BRANCHES: 'manage_branches',
  MANAGE_USERS: 'manage_users',

  // Permissões de branch
  MANAGE_BRANCH: 'manage_branch',
  MANAGE_BRANCH_MINISTRIES: 'manage_branch_ministries',
  MANAGE_BRANCH_EVENTS: 'manage_branch_events',
  MANAGE_BRANCH_SCHEDULES: 'manage_branch_schedules',
  MANAGE_BRANCH_VOLUNTEERS: 'manage_branch_volunteers',

  // Permissões de ministério
  MANAGE_MINISTRY: 'manage_ministry',
  MANAGE_MINISTRY_VOLUNTEERS: 'manage_ministry_volunteers',
  MANAGE_MINISTRY_EVENTS: 'manage_ministry_events',
  MANAGE_MINISTRY_SCHEDULES: 'manage_ministry_schedules',
  MANAGE_MINISTRY_TEMPLATES: 'manage_ministry_templates',

  // Permissões de voluntário
  VIEW_OWN_SCHEDULE: 'view_own_schedule',
  CONFIRM_OWN_ATTENDANCE: 'confirm_own_attendance',
  VIEW_EVENTS: 'view_events',

  // Permissões de relatórios
  VIEW_REPORTS: 'view_reports',
  VIEW_BRANCH_REPORTS: 'view_branch_reports',
  VIEW_MINISTRY_REPORTS: 'view_ministry_reports',
} as const;

// Mapeamento de permissões por role
export const ROLE_PERMISSIONS = {
  [Role.ServusAdmin]: [
    PERMS.MANAGE_ALL_TENANTS,
    PERMS.MANAGE_TENANT,
    PERMS.MANAGE_TENANT_MINISTRIES,
    PERMS.MANAGE_BRANCHES,
    PERMS.MANAGE_USERS,
    PERMS.MANAGE_BRANCH,
    PERMS.MANAGE_BRANCH_MINISTRIES,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_BRANCH_SCHEDULES,
    PERMS.MANAGE_BRANCH_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY,
    PERMS.MANAGE_MINISTRY_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_TEMPLATES,
    PERMS.VIEW_REPORTS,
    PERMS.VIEW_BRANCH_REPORTS,
    PERMS.VIEW_MINISTRY_REPORTS,
  ],

  [Role.TenantAdmin]: [
    PERMS.MANAGE_TENANT,
    PERMS.MANAGE_TENANT_MINISTRIES,
    PERMS.MANAGE_BRANCHES,
    PERMS.MANAGE_USERS,
    PERMS.MANAGE_BRANCH,
    PERMS.MANAGE_BRANCH_MINISTRIES,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_BRANCH_SCHEDULES,
    PERMS.MANAGE_BRANCH_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY,
    PERMS.MANAGE_MINISTRY_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_TEMPLATES,
    PERMS.VIEW_REPORTS,
    PERMS.VIEW_BRANCH_REPORTS,
    PERMS.VIEW_MINISTRY_REPORTS,
  ],

  [Role.BranchAdmin]: [
    PERMS.MANAGE_BRANCH,
    PERMS.MANAGE_BRANCH_MINISTRIES,
    PERMS.MANAGE_BRANCH_EVENTS,
    PERMS.MANAGE_BRANCH_SCHEDULES,
    PERMS.MANAGE_BRANCH_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY,
    PERMS.MANAGE_MINISTRY_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_TEMPLATES,
    PERMS.VIEW_BRANCH_REPORTS,
    PERMS.VIEW_MINISTRY_REPORTS,
  ],

  [Role.Volunteer]: [
    PERMS.VIEW_OWN_SCHEDULE,
    PERMS.CONFIRM_OWN_ATTENDANCE,
    PERMS.VIEW_EVENTS,
  ],

  [MembershipRole.Leader]: [
    PERMS.MANAGE_MINISTRY,
    PERMS.MANAGE_MINISTRY_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_TEMPLATES,
    PERMS.VIEW_MINISTRY_REPORTS,
  ],
} as const;
