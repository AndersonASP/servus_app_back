const { MongoClient } = require('mongodb');

async function checkMembership() {
  console.log('🔍 Conectando ao MongoDB...');
  
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  const db = client.db('servus');
  
  const userEmail = 'andersonalves.tech@gmail.com';
  console.log(`🧪 Buscando usuário: ${userEmail}`);
  
  // Busca o usuário
  const user = await db.collection('users').findOne({ email: userEmail });
  if (!user) {
    console.log('❌ Usuário não encontrado');
    await client.close();
    return;
  }
  
  console.log('✅ Usuário encontrado:', user.name);
  console.log('👤 User ID:', user._id);
  
  // Busca os memberships
  const memberships = await db.collection('memberships').find({ 
    user: user._id, 
    isActive: true 
  }).toArray();
  
  console.log(`📋 Memberships encontrados: ${memberships.length}`);
  
  memberships.forEach((membership, index) => {
    console.log(`\n   ${index + 1}. Membership:`);
    console.log(`      - ID: ${membership._id}`);
    console.log(`      - Role: ${membership.role}`);
    console.log(`      - Tenant: ${membership.tenant}`);
    console.log(`      - Tenant tipo: ${typeof membership.tenant}`);
    console.log(`      - Branch: ${membership.branch}`);
    console.log(`      - Ministry: ${membership.ministry}`);
    console.log(`      - Ativo: ${membership.isActive}`);
  });
  
  // Busca o tenant específico
  if (memberships.length > 0 && memberships[0].tenant) {
    const tenantId = memberships[0].tenant;
    console.log(`\n🔍 Buscando tenant: ${tenantId}`);
    
    const tenant = await db.collection('tenants').findOne({ _id: tenantId });
    if (tenant) {
      console.log('✅ Tenant encontrado:');
      console.log('   - ID:', tenant._id);
      console.log('   - Nome:', tenant.name);
      console.log('   - TenantId:', tenant.tenantId);
    } else {
      console.log('❌ Tenant não encontrado');
    }
  }
  
  await client.close();
  console.log('\n✅ Verificação concluída!');
}

checkMembership().catch(console.error);
