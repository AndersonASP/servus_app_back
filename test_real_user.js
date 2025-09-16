const { MongoClient } = require('mongodb');

async function testRealUser() {
  console.log('🔍 Conectando ao MongoDB...');
  
  // Conecta ao MongoDB (ajuste a URL conforme sua configuração)
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  const db = client.db('servus'); // ou o nome do seu banco
  
  console.log('📊 Listando usuários no banco...');
  
  // Lista todos os usuários
  const users = await db.collection('users').find({}).limit(5).toArray();
  
  console.log(`👥 Encontrados ${users.length} usuários:`);
  users.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
  });
  
  if (users.length > 0) {
    const testUser = users[0];
    console.log(`\n🧪 Testando com usuário: ${testUser.email}`);
    
    // Lista memberships do usuário
    const memberships = await db.collection('memberships').find({ 
      user: testUser._id, 
      isActive: true 
    }).toArray();
    
    console.log(`📋 Memberships encontrados: ${memberships.length}`);
    memberships.forEach((membership, index) => {
      console.log(`   ${index + 1}. Role: ${membership.role}`);
      console.log(`      Tenant: ${membership.tenant}`);
      console.log(`      Branch: ${membership.branch}`);
      console.log(`      Ministry: ${membership.ministry}`);
    });
    
    // Testa os endpoints
    console.log(`\n🌐 Testando endpoints com ${testUser.email}...`);
    
    const axios = require('axios');
    const BASE_URL = 'http://localhost:3000';
    
    try {
      const response = await axios.get(`${BASE_URL}/users/find-by-email/${testUser.email}`, {
        headers: { 'device-id': 'test-device-123' }
      });
      console.log('✅ Endpoint find-by-email funcionou!');
      console.log('📋 Dados:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Erro no endpoint find-by-email:', error.response?.data);
    }
    
    try {
      const response = await axios.get(`${BASE_URL}/users/${testUser.email}/tenant`, {
        headers: { 'device-id': 'test-device-123' }
      });
      console.log('✅ Endpoint tenant funcionou!');
      console.log('📋 Dados:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Erro no endpoint tenant:', error.response?.data);
    }
  }
  
  await client.close();
  console.log('\n✅ Teste concluído!');
}

testRealUser().catch(console.error);
