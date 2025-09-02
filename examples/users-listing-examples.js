// Exemplos de uso dos Endpoints de Listagem com Filtros por Role
// Demonstra como cada tipo de usuário pode listar outros usuários baseado em suas permissões

const API_BASE = 'http://localhost:3000';
let accessToken = '';

// 🔐 Login como diferentes tipos de usuário
async function loginAsUser(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'device-id': 'users-listing-example'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    accessToken = result.access_token;
    
    console.log(`✅ Login realizado como: ${result.user.role}`);
    console.log(`👤 Usuário: ${result.user.name}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    throw error;
  }
}

// ========================================
// 🔍 FLUXO 3: LISTAGEM COM FILTROS POR ROLE
// ========================================

// 🔎 1. TenantAdmin listando usuários por role no tenant
async function tenantAdminListUsersByRole(tenantId, role) {
  console.log(`\n=== TenantAdmin listando usuários com role: ${role} ===`);
  
  try {
    const response = await fetch(`${API_BASE}/users/tenants/${tenantId}/by-role/${role}?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      
      console.log(`✅ ${result.users.length} usuários encontrados com role: ${role}`);
      console.log(`📊 Total: ${result.pagination.total} usuários`);
      console.log(`📄 Página ${result.pagination.page} de ${result.pagination.pages}`);
      
      result.users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email})`);
        console.log(`     📱 Telefone: ${user.phone || 'N/A'}`);
        console.log(`     🏢 Branch: ${user.membership.branch?.name || 'N/A'}`);
        console.log(`     ⛪ Ministry: ${user.membership.ministry?.name || 'N/A'}`);
      });
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error.message);
    throw error;
  }
}

// 🔎 2. BranchAdmin listando usuários por role na sua branch
async function branchAdminListUsersByRoleInBranch(tenantId, branchId, role) {
  console.log(`\n=== BranchAdmin listando usuários com role: ${role} na branch ===`);
  
  try {
    const response = await fetch(`${API_BASE}/users/tenants/${tenantId}/branches/${branchId}/by-role/${role}?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      
      console.log(`✅ ${result.users.length} usuários encontrados com role: ${role} na branch`);
      console.log(`📊 Total: ${result.pagination.total} usuários`);
      console.log(`📄 Página ${result.pagination.page} de ${result.pagination.pages}`);
      
      result.users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email})`);
        console.log(`     📱 Telefone: ${user.phone || 'N/A'}`);
        console.log(`     ⛪ Ministry: ${user.membership.ministry?.name || 'N/A'}`);
        console.log(`     ✅ Perfil completo: ${user.profileCompleted ? 'Sim' : 'Não'}`);
      });
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao listar usuários na branch:', error.message);
    throw error;
  }
}

// 🔎 3. Leader listando voluntários do seu ministry
async function leaderListVolunteersByMinistry(tenantId, ministryId) {
  console.log(`\n=== Leader listando voluntários do ministry ===`);
  
  try {
    const response = await fetch(`${API_BASE}/users/tenants/${tenantId}/ministries/${ministryId}/volunteers?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      
      console.log(`✅ ${result.users.length} voluntários encontrados no ministry`);
      console.log(`📊 Total: ${result.pagination.total} voluntários`);
      console.log(`📄 Página ${result.pagination.page} de ${result.pagination.pages}`);
      
      result.users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email})`);
        console.log(`     📱 Telefone: ${user.phone || 'N/A'}`);
        console.log(`     🏢 Branch: ${user.membership.branch?.name || 'N/A'}`);
        console.log(`     🛠️ Habilidades: ${user.skills?.join(', ') || 'N/A'}`);
        console.log(`     ⏰ Disponibilidade: ${user.availability || 'N/A'}`);
        console.log(`     ✅ Perfil completo: ${user.profileCompleted ? 'Sim' : 'Não'}`);
      });
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao listar voluntários do ministry:', error.message);
    throw error;
  }
}

// 🔎 4. Dashboard de usuários por tenant (TenantAdmin)
async function tenantAdminGetDashboard(tenantId) {
  console.log(`\n=== TenantAdmin visualizando dashboard do tenant ===`);
  
  try {
    const response = await fetch(`${API_BASE}/users/tenants/${tenantId}/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      
      console.log(`📊 Dashboard do Tenant: ${tenantId}`);
      console.log(`👥 Total de usuários: ${result.stats.totalUsers}`);
      
      console.log(`\n📈 Estatísticas por Role:`);
      result.stats.byRole.forEach(stat => {
        console.log(`  • ${stat._id}: ${stat.count} usuários`);
      });
      
      console.log(`\n🏢 Estatísticas por Branch:`);
      result.stats.byBranch.forEach(stat => {
        console.log(`  • ${stat._id}: ${stat.totalUsers} usuários (${stat.roles.join(', ')})`);
      });
      
      console.log(`\n🆕 Usuários recentes (últimos 7 dias):`);
      result.recentUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
      });
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao obter dashboard do tenant:', error.message);
    throw error;
  }
}

// 🔎 5. Dashboard de usuários por branch (BranchAdmin)
async function branchAdminGetDashboard(tenantId, branchId) {
  console.log(`\n=== BranchAdmin visualizando dashboard da branch ===`);
  
  try {
    const response = await fetch(`${API_BASE}/users/tenants/${tenantId}/branches/${branchId}/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      
      console.log(`📊 Dashboard da Branch: ${branchId}`);
      console.log(`👥 Total de usuários: ${result.stats.totalUsers}`);
      
      console.log(`\n📈 Estatísticas por Role:`);
      result.stats.byRole.forEach(stat => {
        console.log(`  • ${stat._id}: ${stat.count} usuários`);
      });
      
      console.log(`\n⛪ Estatísticas por Ministry:`);
      result.stats.byMinistry.forEach(stat => {
        console.log(`  • ${stat._id}: ${stat.totalUsers} usuários (${stat.roles.join(', ')})`);
      });
      
      console.log(`\n🆕 Usuários recentes na branch (últimos 7 dias):`);
      result.recentUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
      });
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao obter dashboard da branch:', error.message);
    throw error;
  }
}

// 🔎 6. Busca de usuários por nome/email (com escopo baseado na role)
async function searchUsers(searchTerm) {
  console.log(`\n=== Buscando usuários por: "${searchTerm}" ===`);
  
  try {
    const response = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(searchTerm)}&page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      
      console.log(`🔍 Resultados para: "${searchTerm}"`);
      console.log(`✅ ${result.users.length} usuários encontrados`);
      console.log(`📊 Total: ${result.pagination.total} usuários`);
      console.log(`📄 Página ${result.pagination.page} de ${result.pagination.pages}`);
      
      result.users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email})`);
        console.log(`     📱 Telefone: ${user.phone || 'N/A'}`);
        console.log(`     🔗 Role: ${user.membership.role}`);
        console.log(`     🏢 Branch: ${user.membership.branch?.name || 'N/A'}`);
        console.log(`     ⛪ Ministry: ${user.membership.ministry?.name || 'N/A'}`);
      });
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro na busca de usuários:', error.message);
    throw error;
  }
}

// ========================================
// 🎯 DEMONSTRAÇÃO COMPLETA DOS ENDPOINTS DE LISTAGEM
// ========================================

async function demonstrateListingEndpoints() {
  console.log('🚀 Demonstrando os Endpoints de Listagem com Filtros por Role\n');
  
  try {
    // === CENÁRIO 1: TenantAdmin ===
    console.log('📋 CENÁRIO 1: TenantAdmin');
    console.log('   → Pode ver todos os usuários do tenant\n');
    
    await loginAsUser('tenantadmin@igreja.com', 'admin123');
    
    // Listar todos os leaders do tenant
    await tenantAdminListUsersByRole('tenant123', 'leader');
    
    // Listar todos os volunteers do tenant
    await tenantAdminListUsersByRole('tenant123', 'volunteer');
    
    // Dashboard do tenant
    await tenantAdminGetDashboard('tenant123');
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // === CENÁRIO 2: BranchAdmin ===
    console.log('📋 CENÁRIO 2: BranchAdmin');
    console.log('   → Pode ver usuários apenas da sua branch\n');
    
    await loginAsUser('branchadmin@filial.com', 'admin123');
    
    // Listar leaders da branch
    await branchAdminListUsersByRoleInBranch('tenant123', 'branch456', 'leader');
    
    // Listar volunteers da branch
    await branchAdminListUsersByRoleInBranch('tenant123', 'branch456', 'volunteer');
    
    // Dashboard da branch
    await branchAdminGetDashboard('tenant123', 'branch456');
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // === CENÁRIO 3: Leader ===
    console.log('📋 CENÁRIO 3: Leader');
    console.log('   → Pode ver voluntários do seu ministry\n');
    
    await loginAsUser('lider@jovens.com', 'lider123');
    
    // Listar voluntários do ministry
    await leaderListVolunteersByMinistry('tenant123', 'jovens123');
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // === CENÁRIO 4: Busca Global ===
    console.log('📋 CENÁRIO 4: Busca Global');
    console.log('   → Cada usuário busca no seu escopo\n');
    
    // Buscar como TenantAdmin
    await loginAsUser('tenantadmin@igreja.com', 'admin123');
    await searchUsers('Ana');
    
    // Buscar como BranchAdmin
    await loginAsUser('branchadmin@filial.com', 'admin123');
    await searchUsers('Carlos');
    
    console.log('\n🎉 Demonstração dos endpoints de listagem concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na demonstração:', error.message);
    throw error;
  }
}

// 🧪 Função principal
async function runUsersListingExamples() {
  try {
    // Executar demonstração
    await demonstrateListingEndpoints();
    
    console.log('\n🎯 Exemplos de Listagem executados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro nos exemplos:', error.message);
  }
}

// 📋 Exemplos de uso individual
const examples = {
  // TenantAdmin
  listUsersByRole: async (tenantId, role) => {
    await loginAsUser('tenantadmin@igreja.com', 'admin123');
    return await tenantAdminListUsersByRole(tenantId, role);
  },
  
  getTenantDashboard: async (tenantId) => {
    await loginAsUser('tenantadmin@igreja.com', 'admin123');
    return await tenantAdminGetDashboard(tenantId);
  },
  
  // BranchAdmin
  listUsersInBranch: async (tenantId, branchId, role) => {
    await loginAsUser('branchadmin@filial.com', 'admin123');
    return await branchAdminListUsersByRoleInBranch(tenantId, branchId, role);
  },
  
  getBranchDashboard: async (tenantId, branchId) => {
    await loginAsUser('branchadmin@filial.com', 'admin123');
    return await branchAdminGetDashboard(tenantId, branchId);
  },
  
  // Leader
  listVolunteersInMinistry: async (tenantId, ministryId) => {
    await loginAsUser('lider@jovens.com', 'lider123');
    return await leaderListVolunteersByMinistry(tenantId, ministryId);
  },
  
  // Busca
  searchUsers: async (searchTerm) => {
    await loginAsUser('tenantadmin@igreja.com', 'admin123');
    return await searchUsers(searchTerm);
  }
};

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    tenantAdminListUsersByRole,
    branchAdminListUsersByRoleInBranch,
    leaderListVolunteersByMinistry,
    tenantAdminGetDashboard,
    branchAdminGetDashboard,
    searchUsers,
    demonstrateListingEndpoints,
    runUsersListingExamples,
    examples
  };
}

// Executar exemplo se chamado diretamente
if (typeof window === 'undefined' && require.main === module) {
  runUsersListingExamples();
} 