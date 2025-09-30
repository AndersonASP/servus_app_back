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
  MANAGE_BRANCH_SCALES: 'manage_branch_scales',
  MANAGE_BRANCH_VOLUNTEERS: 'manage_branch_volunteers',

  // Permissões de ministério
  MANAGE_MINISTRY: 'manage_ministry',
  MANAGE_MINISTRY_VOLUNTEERS: 'manage_ministry_volunteers',
  MANAGE_MINISTRY_EVENTS: 'manage_ministry_events',
  MANAGE_MINISTRY_SCHEDULES: 'manage_ministry_schedules',
  MANAGE_MINISTRY_SCALES: 'manage_ministry_scales',
  MANAGE_MINISTRY_TEMPLATES: 'manage_ministry_templates',

  // Permissões de voluntário
  VIEW_OWN_SCHEDULE: 'view_own_schedule',
  CONFIRM_OWN_ATTENDANCE: 'confirm_own_attendance',
  VIEW_EVENTS: 'view_events',
  VIEW_SCALES: 'view_scales',

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
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_BRANCH_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY,
    PERMS.MANAGE_MINISTRY_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_SCALES,
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
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_BRANCH_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY,
    PERMS.MANAGE_MINISTRY_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_SCALES,
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
    PERMS.MANAGE_BRANCH_SCALES,
    PERMS.MANAGE_BRANCH_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY,
    PERMS.MANAGE_MINISTRY_VOLUNTEERS,
    PERMS.MANAGE_MINISTRY_EVENTS,
    PERMS.MANAGE_MINISTRY_SCHEDULES,
    PERMS.MANAGE_MINISTRY_SCALES,
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
    PERMS.MANAGE_MINISTRY_SCALES,
    PERMS.MANAGE_MINISTRY_TEMPLATES,
    PERMS.VIEW_MINISTRY_REPORTS,
  ],
} as const;

// 🆕 Função para determinar prioridade de roles (maior número = maior prioridade)
export function getRolePriority(role: string): number {
  const priorityMap: Record<string, number> = {
    [Role.ServusAdmin]: 5,
    [Role.TenantAdmin]: 4,
    [Role.BranchAdmin]: 3,
    [MembershipRole.Leader]: 2,
    'volunteer': 1, // Unifica ambos os tipos de volunteer
  };
  
  return priorityMap[role] || 0;
}

// 🆕 Função para encontrar o membership com maior prioridade
export function findHighestPriorityMembership(memberships: any[]): any | null {
  if (!memberships || memberships.length === 0) {
    return null;
  }
  
  if (memberships.length === 1) {
    return memberships[0];
  }
  
  // Ordenar por prioridade (maior primeiro)
  const sortedMemberships = memberships.sort((a, b) => {
    const priorityA = getRolePriority(a.role);
    const priorityB = getRolePriority(b.role);
    return priorityB - priorityA; // Descendente
  });
  
  console.log('🔍 [RolePriority] Memberships ordenados por prioridade:');
  sortedMemberships.forEach((membership, index) => {
    console.log(`   ${index + 1}. Role: ${membership.role} (prioridade: ${getRolePriority(membership.role)})`);
  });
  
  return sortedMemberships[0];
}

// 🆕 Função específica para encontrar o membership principal de um líder
export function findLeaderPrimaryMembership(memberships: any[]): any | null {
  console.log('🔍 [LeaderPrimary] ===== INICIANDO SELEÇÃO DE LÍDER =====');
  console.log('🔍 [LeaderPrimary] Total de memberships para analisar:', memberships.length);
  
  if (!memberships || memberships.length === 0) {
    console.log('❌ [LeaderPrimary] Nenhum membership encontrado');
    return null;
  }
  
  // Primeiro, tentar encontrar um membership de líder
  const leaderMemberships = memberships.filter(m => m.role === MembershipRole.Leader);
  
  console.log('🔍 [LeaderPrimary] Memberships de líder encontrados:', leaderMemberships.length);
  
  if (leaderMemberships.length > 0) {
    // Debug: mostrar todos os memberships de líder
    leaderMemberships.forEach((membership, index) => {
      console.log(`🔍 [LeaderPrimary] Membership de líder ${index + 1}:`);
      console.log(`   - Role: ${membership.role}`);
      console.log(`   - Ministry: ${membership.ministry?._id?.toString()}`);
      console.log(`   - Branch: ${membership.branch?._id?.toString()}`);
    });
    
    if (leaderMemberships.length === 1) {
      console.log('🔍 [LeaderPrimary] Apenas um membership de líder, usando ele');
      return leaderMemberships[0];
    } else {
      console.log('🔍 [LeaderPrimary] Múltiplos memberships de líder, usando lógica de prioridade');
      // Se há múltiplos memberships de líder, usar a lógica de prioridade
      return findHighestPriorityMembership(leaderMemberships);
    }
  }
  
  // Se não há membership de líder, usar a lógica de prioridade normal
  console.log('🔍 [LeaderPrimary] Nenhum membership de líder encontrado, usando lógica de prioridade');
  return findHighestPriorityMembership(memberships);
}
