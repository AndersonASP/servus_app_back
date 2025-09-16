const { MongoClient } = require('mongodb');

async function checkEmail() {
  console.log('🔍 Conectando ao MongoDB...');
  
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  const db = client.db('servus');
  
  console.log('📧 Verificando emails no banco...');
  
  // Lista todos os emails
  const users = await db.collection('users').find({}, { projection: { email: 1, name: 1 } }).toArray();
  
  console.log('📋 Emails encontrados no banco:');
  users.forEach((user, index) => {
    console.log(`   ${index + 1}. "${user.email}" (${user.name})`);
    console.log(`      - Tipo: ${typeof user.email}`);
    console.log(`      - Length: ${user.email.length}`);
    console.log(`      - Normalizado: "${user.email.toLowerCase().trim()}"`);
  });
  
  // Testa busca específica
  const testEmail = 'admin@servus.com';
  console.log(`\n🧪 Testando busca por: "${testEmail}"`);
  
  const user = await db.collection('users').findOne({ email: testEmail });
  console.log('✅ Usuário encontrado:', !!user);
  
  if (user) {
    console.log('👤 Dados:', user.name, user.email);
  }
  
  // Testa busca normalizada
  const normalizedEmail = testEmail.toLowerCase().trim();
  console.log(`\n🧪 Testando busca normalizada por: "${normalizedEmail}"`);
  
  const user2 = await db.collection('users').findOne({ email: normalizedEmail });
  console.log('✅ Usuário encontrado (normalizado):', !!user2);
  
  if (user2) {
    console.log('👤 Dados:', user2.name, user2.email);
  }
  
  await client.close();
  console.log('\n✅ Verificação concluída!');
}

checkEmail().catch(console.error);
