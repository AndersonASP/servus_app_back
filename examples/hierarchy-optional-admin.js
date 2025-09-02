// Exemplo de uso do Sistema Hierárquico com Admin Opcional
// Demonstra como criar tenants e branches com ou sem admin

const API_BASE = 'http://localhost:3000';
let accessToken = '';

// 🔐 Login como ServusAdmin
async function loginAsServusAdmin() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'device-id': 'hierarchy-example'
      },
      body: JSON.stringify({ 
        email: 'servus@admin.com', 
        password: 'admin123' 
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    accessToken = result.access_token;
    
    console.log('✅ Login ServusAdmin realizado!');
    console.log('👤 Usuário:', result.user.name);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    throw error;
  }
}

// 🏢 1. Criar Tenant SEM Admin (Setup Gradual)
async function createTenantWithoutAdmin() {
  console.log('\n=== Criando Tenant SEM Admin ===');
  
  try {
    const response = await fetch(`${API_BASE}/hierarchy/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        tenantData: {
          name: "Igreja Batista Central",
          description: "Igreja principal da rede",
          plan: "pro",
          maxBranches: 5,
          cnpj: "12.345.678/0001-90",
          email: "contato@igrejabatista.com",
          telefone: "(11) 3333-3333"
        }
        // adminData omitido - admin será criado depois
      })
    });

    if (response.status === 201) {
      const result = await response.json();
      const location = response.headers.get('Location');
      
      console.log('✅ Tenant criado com sucesso!');
      console.log('🏢 Nome:', result.tenant.name);
      console.log('🏷️ ID:', result.tenant.tenantId);
      console.log('📍 Location:', location);
      console.log('👤 Admin:', result.admin ? 'Sim' : 'Não');
      console.log('🔗 Membership:', result.membership ? 'Sim' : 'Não');
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar tenant:', error.message);
    throw error;
  }
}

// 🏢 2. Criar Tenant COM Admin (Setup Completo)
async function createTenantWithAdmin() {
  console.log('\n=== Criando Tenant COM Admin ===');
  
  try {
    const response = await fetch(`${API_BASE}/hierarchy/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        tenantData: {
          name: "Igreja Presbiteriana",
          description: "Igreja presbiteriana da cidade",
          plan: "basic",
          maxBranches: 1,
          cnpj: "98.765.432/0001-10",
          email: "contato@igrejapresbiteriana.com",
          telefone: "(11) 4444-4444"
        },
        adminData: {
          name: "Pastor Carlos Silva",
          email: "carlos@igrejapresbiteriana.com",
          password: "Pastor@2024"
        }
      })
    });

    if (response.status === 201) {
      const result = await response.json();
      const location = response.headers.get('Location');
      
      console.log('✅ Tenant criado com sucesso!');
      console.log('🏢 Nome:', result.tenant.name);
      console.log('🏷️ ID:', result.tenant.tenantId);
      console.log('📍 Location:', location);
      console.log('👤 Admin:', result.admin.name);
      console.log('🔗 Membership:', result.membership.role);
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar tenant:', error.message);
    throw error;
  }
}

// 🏪 3. Criar Branch SEM Admin
async function createBranchWithoutAdmin(tenantId) {
  console.log('\n=== Criando Branch SEM Admin ===');
  
  try {
    const response = await fetch(`${API_BASE}/hierarchy/tenants/${tenantId}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        branchData: {
          name: "Filial Sul",
          description: "Filial na zona sul da cidade",
          telefone: "(11) 5555-5555",
          email: "sul@igrejabatista.com",
          endereco: {
            cep: "04567-890",
            rua: "Rua das Palmeiras",
            numero: "789",
            bairro: "Jardim Sul",
            cidade: "São Paulo",
            estado: "SP"
          }
        }
        // adminData omitido - admin será criado depois
      })
    });

    if (response.status === 201) {
      const result = await response.json();
      const location = response.headers.get('Location');
      
      console.log('✅ Branch criada com sucesso!');
      console.log('🏪 Nome:', result.branch.name);
      console.log('🏷️ ID:', result.branch.branchId);
      console.log('📍 Location:', location);
      console.log('👤 Admin:', result.admin ? 'Sim' : 'Não');
      console.log('🔗 Membership:', result.membership ? 'Sim' : 'Não');
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar branch:', error.message);
    throw error;
  }
}

// 🏪 4. Criar Branch COM Admin
async function createBranchWithAdmin(tenantId) {
  console.log('\n=== Criando Branch COM Admin ===');
  
  try {
    const response = await fetch(`${API_BASE}/hierarchy/tenants/${tenantId}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        branchData: {
          name: "Filial Norte",
          description: "Filial na zona norte da cidade",
          telefone: "(11) 6666-6666",
          email: "norte@igrejabatista.com",
          endereco: {
            cep: "02345-678",
            rua: "Avenida Norte",
            numero: "456",
            bairro: "Vila Nova",
            cidade: "São Paulo",
            estado: "SP"
          }
        },
        adminData: {
          name: "Pastor Ana Santos",
          email: "ana@filialnorte.com",
          password: "Pastor@2024"
        }
      })
    });

    if (response.status === 201) {
      const result = await response.json();
      const location = response.headers.get('Location');
      
      console.log('✅ Branch criada com sucesso!');
      console.log('🏪 Nome:', result.branch.name);
      console.log('🏷️ ID:', result.branch.branchId);
      console.log('📍 Location:', location);
      console.log('👤 Admin:', result.admin.name);
      console.log('🔗 Membership:', result.membership.role);
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar branch:', error.message);
    throw error;
  }
}

// 👤 5. Adicionar Admin a um Tenant existente
async function addAdminToTenant(tenantId) {
  console.log('\n=== Adicionando Admin ao Tenant ===');
  
  try {
    const response = await fetch(`${API_BASE}/hierarchy/tenants/${tenantId}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        userData: {
          name: "Pastor João Silva",
          email: "joao@igrejabatista.com",
          password: "Pastor@2024"
        },
        membershipData: {
          role: "tenant_admin"
        }
      })
    });

    if (response.status === 201) {
      const result = await response.json();
      const location = response.headers.get('Location');
      
      console.log('✅ Admin adicionado com sucesso!');
      console.log('👤 Nome:', result.user.name);
      console.log('📧 Email:', result.user.email);
      console.log('🔗 Membership:', result.membership.role);
      console.log('📍 Location:', location);
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao adicionar admin:', error.message);
    throw error;
  }
}

// 👤 6. Adicionar Admin a uma Branch existente
async function addAdminToBranch(tenantId, branchId) {
  console.log('\n=== Adicionando Admin à Branch ===');
  
  try {
    const response = await fetch(`${API_BASE}/hierarchy/tenants/${tenantId}/branches/${branchId}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        userData: {
          name: "Pastor Pedro Costa",
          email: "pedro@filialsul.com",
          password: "Pastor@2024"
        },
        membershipData: {
          role: "branch_admin"
        }
      })
    });

    if (response.status === 201) {
      const result = await response.json();
      const location = response.headers.get('Location');
      
      console.log('✅ Admin da branch adicionado com sucesso!');
      console.log('👤 Nome:', result.user.name);
      console.log('📧 Email:', result.user.email);
      console.log('🔗 Membership:', result.membership.role);
      console.log('📍 Location:', location);
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao adicionar admin da branch:', error.message);
    throw error;
  }
}

// 🎯 7. Fluxo completo: Setup Gradual vs Setup Completo
async function demonstrateBothApproaches() {
  console.log('🚀 Demonstrando Setup Gradual vs Setup Completo\n');
  
  try {
    // === SETUP GRADUAL ===
    console.log('📋 SETUP GRADUAL: Criar estrutura primeiro, adicionar admins depois');
    
    // 1. Criar tenant sem admin
    const tenantGradual = await createTenantWithoutAdmin();
    
    // 2. Criar branch sem admin
    const branchGradual = await createBranchWithoutAdmin(tenantGradual.tenant._id);
    
    // 3. Adicionar admin ao tenant
    const adminTenant = await addAdminToTenant(tenantGradual.tenant._id);
    
    // 4. Adicionar admin à branch
    const adminBranch = await addAdminToBranch(tenantGradual.tenant._id, branchGradual.branch._id);
    
    console.log('\n✅ Setup Gradual concluído!');
    console.log('📊 Resumo:');
    console.log(`   🏢 1 Tenant: ${tenantGradual.tenant.name}`);
    console.log(`   🏪 1 Branch: ${branchGradual.branch.name}`);
    console.log(`   👤 1 Admin do Tenant: ${adminTenant.user.name}`);
    console.log(`   👤 1 Admin da Branch: ${adminBranch.user.name}`);
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // === SETUP COMPLETO ===
    console.log('📋 SETUP COMPLETO: Criar estrutura + admins de uma vez');
    
    // 1. Criar tenant com admin
    const tenantCompleto = await createTenantWithAdmin();
    
    // 2. Criar branch com admin
    const branchCompleto = await createBranchWithAdmin(tenantCompleto.tenant._id);
    
    console.log('\n✅ Setup Completo concluído!');
    console.log('📊 Resumo:');
    console.log(`   🏢 1 Tenant: ${tenantCompleto.tenant.name}`);
    console.log(`   👤 1 Admin do Tenant: ${tenantCompleto.admin.name}`);
    console.log(`   🏪 1 Branch: ${branchCompleto.branch.name}`);
    console.log(`   👤 1 Admin da Branch: ${branchCompleto.admin.name}`);
    
    console.log('\n🎉 Demonstração concluída com sucesso!');
    
    return {
      gradual: { tenant: tenantGradual, branch: branchGradual, adminTenant, adminBranch },
      completo: { tenant: tenantCompleto, branch: branchCompleto }
    };
    
  } catch (error) {
    console.error('❌ Erro na demonstração:', error.message);
    throw error;
  }
}

// 🧪 8. Função principal
async function runOptionalAdminExample() {
  try {
    // Fazer login como ServusAdmin
    await loginAsServusAdmin();
    
    // Executar demonstração
    await demonstrateBothApproaches();
    
    console.log('\n🎯 Exemplo de Admin Opcional executado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no exemplo:', error.message);
  }
}

// 📋 9. Exemplos de uso individual
const examples = {
  // Setup gradual
  setupGradual: async () => {
    await loginAsServusAdmin();
    const tenant = await createTenantWithoutAdmin();
    const branch = await createBranchWithoutAdmin(tenant.tenant._id);
    return { tenant, branch };
  },
  
  // Setup completo
  setupCompleto: async () => {
    await loginAsServusAdmin();
    const tenant = await createTenantWithAdmin();
    const branch = await createBranchWithAdmin(tenant.tenant._id);
    return { tenant, branch };
  },
  
  // Adicionar admin depois
  addAdminLater: async (tenantId) => {
    await loginAsServusAdmin();
    return await addAdminToTenant(tenantId);
  }
};

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createTenantWithoutAdmin,
    createTenantWithAdmin,
    createBranchWithoutAdmin,
    createBranchWithAdmin,
    addAdminToTenant,
    addAdminToBranch,
    demonstrateBothApproaches,
    runOptionalAdminExample,
    examples
  };
}

// Executar exemplo se chamado diretamente
if (typeof window === 'undefined' && require.main === module) {
  runOptionalAdminExample();
} 