const { MongoClient } = require('mongodb');

async function checkAtlasDatabase() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    // Listar bancos de dados
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('📋 Bancos de dados disponíveis:');
    dbs.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Verificar se existe banco 'servus'
    const servusDb = client.db('servus');
    const collections = await servusDb.listCollections().toArray();
    console.log('\n📋 Coleções no banco "servus":');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Verificar usuários existentes
    const users = await servusDb.collection('users').find().limit(5).toArray();
    console.log('\n👤 Usuários existentes:');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Verificar se servus_admin existe
    const servusAdmin = await servusDb.collection('users').findOne({ email: 'servus_admin@servus.com' });
    if (servusAdmin) {
      console.log('\n✅ Servus Admin encontrado!');
      console.log(`   - ID: ${servusAdmin._id}`);
      console.log(`   - Nome: ${servusAdmin.name}`);
      console.log(`   - Role: ${servusAdmin.role}`);
    } else {
      console.log('\n❌ Servus Admin NÃO encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

checkAtlasDatabase();
