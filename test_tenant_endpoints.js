const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testTenantEndpoints() {
  console.log('🧪 Testando endpoints de determinação de tenant...\n');

  // Lista de emails para testar (adicione emails reais do seu sistema)
  const testEmails = [
    'admin@servus.com',
    'test@example.com',
    'user@test.com'
  ];

  for (const email of testEmails) {
    console.log(`📧 Testando email: ${email}`);
    console.log('─'.repeat(50));

    try {
      // Teste 1: Endpoint find-by-email
      console.log('🔍 Testando /users/find-by-email...');
      const response1 = await axios.get(`${BASE_URL}/users/find-by-email/${email}`, {
        headers: {
          'device-id': 'test-device-123'
        }
      });

      console.log('✅ Status:', response1.status);
      console.log('📋 Dados:', JSON.stringify(response1.data, null, 2));

      if (response1.data && response1.data.memberships) {
        console.log(`📊 Memberships encontrados: ${response1.data.memberships.length}`);
        response1.data.memberships.forEach((membership, index) => {
          console.log(`   ${index + 1}. Role: ${membership.role}`);
          console.log(`      Tenant: ${membership.tenant ? membership.tenant.id : 'NENHUM'}`);
          console.log(`      Branch: ${membership.branch ? membership.branch.name : 'NENHUM'}`);
          console.log(`      Ministry: ${membership.ministry ? membership.ministry.name : 'NENHUM'}`);
        });
      }

    } catch (error) {
      console.log('❌ Erro no endpoint find-by-email:');
      console.log('   Status:', error.response?.status);
      console.log('   Dados:', error.response?.data);
    }

    console.log('');

    try {
      // Teste 2: Endpoint tenant direto
      console.log('🔍 Testando /users/:email/tenant...');
      const response2 = await axios.get(`${BASE_URL}/users/${email}/tenant`, {
        headers: {
          'device-id': 'test-device-123'
        }
      });

      console.log('✅ Status:', response2.status);
      console.log('📋 Dados:', JSON.stringify(response2.data, null, 2));

    } catch (error) {
      console.log('❌ Erro no endpoint tenant direto:');
      console.log('   Status:', error.response?.status);
      console.log('   Dados:', error.response?.data);
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  // Teste adicional: Listar todos os usuários
  console.log('👥 Listando todos os usuários no sistema...');
  try {
    const response = await axios.get(`${BASE_URL}/users`, {
      headers: {
        'device-id': 'test-device-123',
        'x-tenant-id': 'test-tenant' // Pode precisar ajustar
      }
    });
    console.log('✅ Usuários encontrados:', response.data.length);
  } catch (error) {
    console.log('❌ Erro ao listar usuários:', error.response?.data);
  }
}

// Executar testes
testTenantEndpoints().catch(console.error);
