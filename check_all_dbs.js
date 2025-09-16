const { MongoClient } = require('mongodb');

async function checkAllDbs() {
  console.log('🔍 Conectando ao MongoDB...');
  
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  // Lista todos os bancos
  const adminDb = client.db().admin();
  const dbs = await adminDb.listDatabases();
  
  console.log('📊 Bancos disponíveis:');
  dbs.databases.forEach((db, index) => {
    console.log(`   ${index + 1}. ${db.name}`);
  });
  
  // Verifica cada banco
  for (const dbInfo of dbs.databases) {
    if (dbInfo.name === 'admin' || dbInfo.name === 'local') continue;
    
    console.log(`\n🔍 Verificando banco: ${dbInfo.name}`);
    const db = client.db(dbInfo.name);
    
    // Verifica se tem collection users
    const collections = await db.listCollections().toArray();
    const hasUsers = collections.some(col => col.name === 'users');
    
    if (hasUsers) {
      console.log('✅ Tem collection users');
      
      const users = await db.collection('users').find({}, { projection: { email: 1, name: 1 } }).limit(3).toArray();
      console.log(`👥 Usuários encontrados: ${users.length}`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.name})`);
      });
      
      // Verifica se tem o usuário específico
      const specificUser = await db.collection('users').findOne({ email: 'andersonalves.tech@gmail.com' });
      if (specificUser) {
        console.log('🎯 Usuário andersonalves.tech@gmail.com encontrado neste banco!');
        console.log('👤 Dados:', specificUser.name, specificUser.email);
      }
    } else {
      console.log('❌ Não tem collection users');
    }
  }
  
  await client.close();
  console.log('\n✅ Verificação concluída!');
}

checkAllDbs().catch(console.error);
