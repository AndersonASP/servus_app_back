// Exemplo de uso dos Dois Fluxos do Módulo Users
// Demonstra criação interna (admin) vs auto-registro (voluntário)

const API_BASE = 'http://localhost:3000';
let accessToken = '';

// 🔐 Login como TenantAdmin
async function loginAsTenantAdmin() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'device-id': 'users-example'
      },
      body: JSON.stringify({ 
        email: 'admin@igreja.com', 
        password: 'admin123' 
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    accessToken = result.access_token;
    
    console.log('✅ Login TenantAdmin realizado!');
    console.log('👤 Usuário:', result.user.name);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    throw error;
  }
}

// ========================================
// 🔐 FLUXO 1: CRIAÇÃO INTERNA (ADMIN)
// ========================================

// 👤 1. Admin cria líder de ministério
async function adminCreateLeader(tenantId) {
  console.log('\n=== Admin criando Líder de Ministério ===');
  
  try {
    const response = await fetch(`${API_BASE}/users/tenants/${tenantId}/with-membership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        userData: {
          name: "Líder Ana Costa",
          email: "ana@lider.com",
          password: "Lider@2024"
        },
        membershipData: {
          role: "leader",
          ministryId: "jovens123" // Ministério de jovens
        }
      })
    });

    if (response.status === 201) {
      const result = await response.json();
      const location = response.headers.get('Location');
      
      console.log('✅ Líder criado com sucesso!');
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
    console.error('❌ Erro ao criar líder:', error.message);
    throw error;
  }
}

// 👤 2. Admin cria voluntário na branch específica
async function adminCreateVolunteerInBranch(tenantId, branchId) {
  console.log('\n=== Admin criando Voluntário na Branch ===');
  
  try {
    const response = await fetch(`${API_BASE}/users/tenants/${tenantId}/branches/${branchId}/with-membership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        userData: {
          name: "Voluntário Carlos Silva",
          email: "carlos@voluntario.com",
          password: "Vol@2024"
        },
        membershipData: {
          role: "volunteer",
          ministryId: "jovens123"
        }
      })
    });

    if (response.status === 201) {
      const result = await response.json();
      const location = response.headers.get('Location');
      
      console.log('✅ Voluntário criado com sucesso!');
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
    console.error('❌ Erro ao criar voluntário:', error.message);
    throw error;
  }
}

// ========================================
// 🔓 FLUXO 2: AUTO-REGISTRO (VOLUNTÁRIO)
// ========================================

// 👤 3. Voluntário se auto-registra via convite
async function volunteerSelfRegister() {
  console.log('\n=== Voluntário se Auto-Registrando ===');
  
  try {
    const response = await fetch(`${API_BASE}/users/self-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: "maria@voluntaria.com",
        password: "Maria@2024",
        name: "Maria Santos",
        invitationToken: "uuid-do-convite-123", // Token do convite
        phone: "(11) 88888-8888",
        birthDate: "1985-05-15",
        address: {
          cep: "04567-890",
          rua: "Rua das Palmeiras",
          numero: "456",
          bairro: "Jardim Sul",
          cidade: "São Paulo",
          estado: "SP"
        }
      })
    });

    if (response.status === 201) {
      const result = await response.json();
      const location = response.headers.get('Location');
      
      console.log('✅ Auto-registro realizado com sucesso!');
      console.log('👤 Nome:', result.user.name);
      console.log('📧 Email:', result.user.email);
      console.log('📱 Telefone:', result.user.phone);
      console.log('📍 Endereço:', result.user.address?.cidade);
      console.log('📝 Mensagem:', result.message);
      console.log('🔄 Próximo passo:', result.nextStep);
      console.log('📍 Location:', location);
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no auto-registro:', error.message);
    throw error;
  }
}

// 👤 4. Voluntário completa perfil após auto-registro
async function volunteerCompleteProfile(userId) {
  console.log('\n=== Voluntário Completando Perfil ===');
  
  try {
    const response = await fetch(`${API_BASE}/users/complete-profile/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: "Maria Santos",
        phone: "(11) 88888-8888",
        birthDate: "1985-05-15",
        address: {
          cep: "04567-890",
          rua: "Rua das Palmeiras",
          numero: "456",
          bairro: "Jardim Sul",
          cidade: "São Paulo",
          estado: "SP"
        },
        bio: "Gosto de ajudar pessoas e servir na igreja. Tenho experiência com música e organização de eventos.",
        skills: ["Música", "Organização", "Tecnologia", "Comunicação"],
        availability: "Fins de semana e noites durante a semana"
      })
    });

    if (response.status === 200) {
      const result = await response.json();
      
      console.log('✅ Perfil completado com sucesso!');
      console.log('👤 Nome:', result.user.name);
      console.log('📱 Telefone:', result.user.phone);
      console.log('📝 Bio:', result.user.bio);
      console.log('🛠️ Habilidades:', result.user.skills?.join(', '));
      console.log('⏰ Disponibilidade:', result.user.availability);
      console.log('✅ Perfil completo:', result.user.profileCompleted);
      console.log('📝 Mensagem:', result.message);
      
      return result;
    } else {
      const error = await response.json();
      throw new Error(`Erro ${response.status}: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao completar perfil:', error.message);
    throw error;
  }
}

// ========================================
// 🎯 DEMONSTRAÇÃO COMPLETA DOS DOIS FLUXOS
// ========================================

async function demonstrateBothFlows() {
  console.log('🚀 Demonstrando os Dois Fluxos do Módulo Users\n');
  
  try {
    // === FLUXO 1: CRIAÇÃO INTERNA (ADMIN) ===
    console.log('📋 FLUXO 1: Criação Interna (ADMIN)');
    console.log('   → Admin cria usuários diretamente no sistema\n');
    
    // Fazer login como TenantAdmin
    await loginAsTenantAdmin();
    
    // 1. Admin cria líder
    const lider = await adminCreateLeader('tenant123');
    
    // 2. Admin cria voluntário na branch
    const voluntario = await adminCreateVolunteerInBranch('tenant123', 'branch456');
    
    console.log('\n✅ Fluxo 1 concluído!');
    console.log('📊 Resumo:');
    console.log(`   👤 1 Líder criado: ${lider.user.name}`);
    console.log(`   👤 1 Voluntário criado: ${voluntario.user.name}`);
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // === FLUXO 2: AUTO-REGISTRO (VOLUNTÁRIO) ===
    console.log('📋 FLUXO 2: Auto-Registro (VOLUNTÁRIO)');
    console.log('   → Voluntário se cadastra via link de convite\n');
    
    // 3. Voluntário se auto-registra
    const voluntaria = await volunteerSelfRegister();
    
    // 4. Voluntário completa perfil
    const perfilCompleto = await volunteerCompleteProfile(voluntaria.user._id);
    
    console.log('\n✅ Fluxo 2 concluído!');
    console.log('📊 Resumo:');
    console.log(`   👤 1 Voluntária auto-registrada: ${voluntaria.user.name}`);
    console.log(`   📝 Perfil completado: ${perfilCompleto.user.profileCompleted}`);
    
    console.log('\n🎉 Demonstração dos dois fluxos concluída com sucesso!');
    
    return {
      fluxo1: { lider, voluntario },
      fluxo2: { voluntaria, perfilCompleto }
    };
    
  } catch (error) {
    console.error('❌ Erro na demonstração:', error.message);
    throw error;
  }
}

// 🧪 Função principal
async function runUsersDualFlowExample() {
  try {
    // Executar demonstração
    await demonstrateBothFlows();
    
    console.log('\n🎯 Exemplo dos Dois Fluxos executado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no exemplo:', error.message);
  }
}

// 📋 Exemplos de uso individual
const examples = {
  // Fluxo 1: Criação interna
  createLeader: async (tenantId) => {
    await loginAsTenantAdmin();
    return await adminCreateLeader(tenantId);
  },
  
  createVolunteer: async (tenantId, branchId) => {
    await loginAsTenantAdmin();
    return await adminCreateVolunteerInBranch(tenantId, branchId);
  },
  
  // Fluxo 2: Auto-registro
  selfRegister: async () => {
    return await volunteerSelfRegister();
  },
  
  completeProfile: async (userId) => {
    return await volunteerCompleteProfile(userId);
  }
};

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    adminCreateLeader,
    adminCreateVolunteerInBranch,
    volunteerSelfRegister,
    volunteerCompleteProfile,
    demonstrateBothFlows,
    runUsersDualFlowExample,
    examples
  };
}

// Executar exemplo se chamado diretamente
if (typeof window === 'undefined' && require.main === module) {
  runUsersDualFlowExample();
} 