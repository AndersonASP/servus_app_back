const { MongoClient } = require('mongodb');

async function checkServusDev() {
  console.log('🔍 Conectando ao MongoDB...');
  
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  const db = client.db('servus_dev');
  
  console.log('📊 Verificando banco servus_dev...');
  
  // Lista todos os usuários
  const users = await db.collection('users').find({}, { projection: { email: 1, name: 1 } }).toArray();
  
  console.log(`👥 Usuários encontrados: ${users.length}`);
  users.forEach((user, index) => {
    console.log(`   ${index + 1}. "${user.email}" (${user.name})`);
  });
  
  // Verifica o usuário específico
  const specificUser = await db.collection('users').findOne({ email: 'andersonalves.tech@gmail.com' });
  if (specificUser) {
    console.log('\n🎯 Usuário andersonalves.tech@gmail.com encontrado!');
    console.log('👤 Dados:', specificUser.name, specificUser.email);
    console.log('👤 ID:', specificUser._id);
    
    // Busca memberships
    const memberships = await db.collection('memberships').find({ 
      user: specificUser._id, 
      isActive: true 
    }).toArray();
    
    console.log(`\n📋 Memberships encontrados: ${memberships.length}`);
    for (let index = 0; index < memberships.length; index++) {
      const membership = memberships[index];
      console.log(`   ${index + 1}. Membership:`);
      console.log(`      - ID: ${membership._id}`);
      console.log(`      - Role: ${membership.role}`);
      console.log(`      - Tenant: ${membership.tenant}`);
      console.log(`      - Branch: ${membership.branch}`);
      console.log(`      - Ministry: ${membership.ministry}`);
      
      // Busca o tenant
      if (membership.tenant) {
        const tenant = await db.collection('tenants').findOne({ _id: membership.tenant });
        if (tenant) {
          console.log(`      - Tenant encontrado: ${tenant.name} (${tenant._id})`);
        } else {
          console.log(`      - Tenant não encontrado`);
        }
      }
    }
  } else {
    console.log('\n❌ Usuário andersonalves.tech@gmail.com NÃO encontrado');
  }
  
  await client.close();
  console.log('\n✅ Verificação concluída!');
}

checkServusDev().catch(console.error);
