const { MongoClient } = require('mongodb');

async function checkTestDatabase() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    // Verificar qual banco está sendo usado
    const db = client.db();
    console.log('📋 Banco atual:', db.databaseName);
    
    // Verificar se existe banco 'test'
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('\n📋 Todos os bancos de dados:');
    dbs.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Verificar usuários no banco atual
    const users = await db.collection('users').find().limit(5).toArray();
    console.log('\n👤 Usuários no banco atual:');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Verificar se servus_admin existe no banco atual
    const servusAdmin = await db.collection('users').findOne({ email: 'servus_admin@servus.com' });
    if (servusAdmin) {
      console.log('\n✅ Servus Admin encontrado no banco atual!');
      console.log('   - ID:', servusAdmin._id);
      console.log('   - Nome:', servusAdmin.name);
      console.log('   - Email:', servusAdmin.email);
      console.log('   - Role:', servusAdmin.role);
    } else {
      console.log('\n❌ Servus Admin NÃO encontrado no banco atual');
    }
    
    // Verificar se existe no banco 'test'
    const testDb = client.db('test');
    const testUsers = await testDb.collection('users').find().limit(5).toArray();
    console.log('\n👤 Usuários no banco "test":');
    testUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    const testServusAdmin = await testDb.collection('users').findOne({ email: 'servus_admin@servus.com' });
    if (testServusAdmin) {
      console.log('\n✅ Servus Admin encontrado no banco "test"!');
      console.log('   - ID:', testServusAdmin._id);
      console.log('   - Nome:', testServusAdmin.name);
      console.log('   - Email:', testServusAdmin.email);
      console.log('   - Role:', testServusAdmin.role);
    } else {
      console.log('\n❌ Servus Admin NÃO encontrado no banco "test"');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

checkTestDatabase();
