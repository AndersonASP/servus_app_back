const { MongoClient } = require('mongodb');

async function checkSpecificEmail() {
  console.log('🔍 Conectando ao MongoDB...');
  
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  const db = client.db('servus');
  
  const testEmail = 'andersonalves.tech@gmail.com';
  console.log(`🧪 Buscando especificamente por: "${testEmail}"`);
  
  // Busca exata
  const user = await db.collection('users').findOne({ email: testEmail });
  console.log('✅ Usuário encontrado (busca exata):', !!user);
  
  if (user) {
    console.log('👤 Dados do usuário:');
    console.log('   - ID:', user._id);
    console.log('   - Nome:', user.name);
    console.log('   - Email:', user.email);
    console.log('   - Role:', user.role);
    console.log('   - TenantId:', user.tenantId);
  }
  
  // Busca normalizada
  const normalizedEmail = testEmail.toLowerCase().trim();
  const user2 = await db.collection('users').findOne({ email: normalizedEmail });
  console.log('✅ Usuário encontrado (normalizado):', !!user2);
  
  // Busca por regex (caso tenha variações)
  const regex = new RegExp(testEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const user3 = await db.collection('users').findOne({ email: regex });
  console.log('✅ Usuário encontrado (regex):', !!user3);
  
  // Lista todos os emails que contenham "andersonalves"
  console.log('\n🔍 Buscando emails que contenham "andersonalves"...');
  const similarUsers = await db.collection('users').find({ 
    email: { $regex: /andersonalves/i } 
  }).toArray();
  
  console.log(`📋 Encontrados ${similarUsers.length} usuários similares:`);
  similarUsers.forEach((user, index) => {
    console.log(`   ${index + 1}. "${user.email}" (${user.name})`);
  });
  
  // Lista todos os emails que contenham "gmail"
  console.log('\n🔍 Buscando emails que contenham "gmail"...');
  const gmailUsers = await db.collection('users').find({ 
    email: { $regex: /gmail/i } 
  }).toArray();
  
  console.log(`📋 Encontrados ${gmailUsers.length} usuários Gmail:`);
  gmailUsers.forEach((user, index) => {
    console.log(`   ${index + 1}. "${user.email}" (${user.name})`);
  });
  
  await client.close();
  console.log('\n✅ Verificação concluída!');
}

checkSpecificEmail().catch(console.error);
