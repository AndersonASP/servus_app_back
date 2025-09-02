// Exemplos práticos de uso do Sistema Hierárquico
// Este arquivo demonstra como usar a API hierárquica para criar tenants, branches e usuários

// 🔐 Configuração base
const API_BASE = 'http://localhost:3000';
let accessToken = '';

// 🏢 1. ServusAdmin criando nova rede de igrejas
async function servusAdminCreateChurch() {
  console.log('=== ServusAdmin criando nova igreja ===');
  
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
        },
        adminData: {
          name: "Pastor João Silva",
          email: "joao@igrejabatista.com",
          password: "Pastor@2024"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Igreja criada com sucesso!');
    console.log('🏢 Tenant:', result.tenant.name, `(${result.tenant.tenantId})`);
    console.log('👤 Admin:', result.admin.name, `(${result.admin.email})`);
    console.log('🔗 Membership:', result.membership.role);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao criar igreja:', error.message);
    throw error;
  }
}

// 🏪 2. TenantAdmin criando filial
async function tenantAdminCreateBranch(tenantId, branchData, adminData = null) {
  console.log('=== TenantAdmin criando filial ===');
  
  try {
    const response = await fetch(`${API_BASE}/hierarchy/tenants/${tenantId}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        branchData: {
          name: branchData.name,
          description: branchData.description,
          telefone: branchData.telefone,
          email: branchData.email,
          endereco: {
            cep: branchData.cep,
            rua: branchData.rua,
            numero: branchData.numero,
            bairro: branchData.bairro,
            cidade: branchData.cidade,
            estado: branchData.estado
          }
        },
        adminData: adminData
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Filial criada com sucesso!');
    console.log('🏪 Branch:', result.branch.name, `(${result.branch.branchId})`);
    
    if (result.admin) {
      console.log('👤 Admin da filial:', result.admin.name);
      console.log('🔗 Membership:', result.membership.role);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao criar filial:', error.message);
    throw error;
  }
}

// 👤 3. Criar usuário com membership específico
async function createUserWithMembership(tenantId, userData, membershipData) {
  console.log('=== Criando usuário com membership ===');
  
  try {
    const response = await fetch(`${API_BASE}/hierarchy/tenants/${tenantId}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        userData: {
          name: userData.name,
          email: userData.email,
          password: userData.password
        },
        membershipData: {
          role: membershipData.role,
          branchId: membershipData.branchId,
          ministryId: membershipData.ministryId
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Usuário criado com sucesso!');
    console.log('👤 Usuário:', result.user.name, `(${result.user.email})`);
    console.log('🔗 Membership:', result.membership.role);
    
    if (result.membership.branch) {
      console.log('🏪 Branch:', result.membership.branch.name);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
    throw error;
  }
}

// 🎯 4. Fluxo completo: Criar igreja + filiais + usuários
async function completeChurchSetup() {
  console.log('🚀 Iniciando setup completo de igreja...\n');
  
  try {
    // Passo 1: ServusAdmin cria igreja matriz
    const igreja = await servusAdminCreateChurch();
    console.log('\n--- Igreja matriz criada ---\n');
    
    // Passo 2: Criar filial com admin
    const filialCentro = await tenantAdminCreateBranch(igreja.tenant._id, {
      name: "Filial Centro",
      description: "Filial no centro da cidade",
      telefone: "(11) 4444-4444",
      email: "centro@igrejabatista.com",
      cep: "01234-567",
      rua: "Rua das Flores",
      numero: "123",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP"
    }, {
      name: "Pastor Pedro Santos",
      email: "pedro@filialcentro.com",
      password: "Pastor@2024"
    });
    console.log('\n--- Filial Centro criada ---\n');
    
    // Passo 3: Criar filial sem admin (ele mesmo será o admin)
    const filialNorte = await tenantAdminCreateBranch(igreja.tenant._id, {
      name: "Filial Norte",
      description: "Filial na zona norte",
      telefone: "(11) 5555-5555",
      email: "norte@igrejabatista.com",
      cep: "02345-678",
      rua: "Avenida Norte",
      numero: "456",
      bairro: "Vila Nova",
      cidade: "São Paulo",
      estado: "SP"
    });
    console.log('\n--- Filial Norte criada ---\n');
    
    // Passo 4: Criar líder de ministério na filial centro
    const liderJovens = await createUserWithMembership(igreja.tenant._id, {
      name: "Líder Ana Costa",
      email: "ana@jovens.com",
      password: "Lider@2024"
    }, {
      role: "leader",
      branchId: filialCentro.branch._id,
      ministryId: "jovens123" // ID do ministério de jovens
    });
    console.log('\n--- Líder de jovens criado ---\n');
    
    // Passo 5: Criar voluntários na filial centro
    const voluntario1 = await createUserWithMembership(igreja.tenant._id, {
      name: "Voluntário Carlos Oliveira",
      email: "carlos@voluntario.com",
      password: "Vol@2024"
    }, {
      role: "volunteer",
      branchId: filialCentro.branch._id,
      ministryId: "jovens123"
    });
    
    const voluntario2 = await createUserWithMembership(igreja.tenant._id, {
      name: "Voluntária Maria Santos",
      email: "maria@voluntaria.com",
      password: "Vol@2024"
    }, {
      role: "volunteer",
      branchId: filialCentro.branch._id,
      ministryId: "jovens123"
    });
    
    console.log('\n--- Voluntários criados ---\n');
    
    // Resumo final
    console.log('🎉 Setup completo realizado com sucesso!');
    console.log('📊 Resumo:');
    console.log(`   🏢 1 Igreja matriz: ${igreja.tenant.name}`);
    console.log(`   🏪 2 Filiais criadas`);
    console.log(`   👤 1 Admin da igreja: ${igreja.admin.name}`);
    console.log(`   👤 1 Admin da filial: ${filialCentro.admin.name}`);
    console.log(`   👤 1 Líder: ${liderJovens.user.name}`);
    console.log(`   👤 2 Voluntários criados`);
    
    return {
      igreja,
      filialCentro,
      filialNorte,
      liderJovens,
      voluntarios: [voluntario1, voluntario2]
    };
    
  } catch (error) {
    console.error('❌ Erro no setup completo:', error.message);
    throw error;
  }
}

// 🔐 5. Função de login para obter token
async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'device-id': 'hierarchy-example'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    accessToken = result.access_token;
    
    console.log('✅ Login realizado com sucesso!');
    console.log('👤 Usuário:', result.user.name);
    console.log('🔑 Token obtido');
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    throw error;
  }
}

// 🧪 6. Função de teste
async function runHierarchyExample() {
  try {
    // Fazer login como ServusAdmin
    await login('servus@admin.com', 'admin123');
    
    // Executar setup completo
    await completeChurchSetup();
    
    console.log('\n🎯 Exemplo hierárquico executado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no exemplo:', error.message);
  }
}

// 📋 7. Exemplos de uso individual
const examples = {
  // Criar apenas igreja
  createChurch: async () => {
    await login('servus@admin.com', 'admin123');
    return await servusAdminCreateChurch();
  },
  
  // Criar apenas filial
  createBranch: async (tenantId) => {
    await login('tenant@admin.com', 'admin123');
    return await tenantAdminCreateBranch(tenantId, {
      name: "Nova Filial",
      description: "Descrição da filial",
      telefone: "(11) 9999-9999"
    });
  },
  
  // Criar apenas usuário
  createUser: async (tenantId) => {
    await login('branch@admin.com', 'admin123');
    return await createUserWithMembership(tenantId, {
      name: "Novo Usuário",
      email: "novo@usuario.com",
      password: "senha123"
    }, {
      role: "volunteer"
    });
  }
};

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    servusAdminCreateChurch,
    tenantAdminCreateBranch,
    createUserWithMembership,
    completeChurchSetup,
    login,
    runHierarchyExample,
    examples
  };
}

// Executar exemplo se chamado diretamente
if (typeof window === 'undefined' && require.main === module) {
  runHierarchyExample();
} 