const { MongoClient, ObjectId } = require('mongodb');

async function checkMinistryMembers() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    const tenantId = '68c5b64ebd9cd3a1aaaf879a';
    const ministryId = '68c5b81fbd9cd3a1aaaf87bd';
    
    console.log(`\n🔍 Verificando membros do ministério ${ministryId} no tenant ${tenantId}`);
    
    // Verificar se o ministério existe
    const ministry = await db.collection('ministries').findOne({ _id: new ObjectId(ministryId) });
    console.log(`\n📋 Ministério encontrado:`, ministry ? ministry.name : 'NÃO ENCONTRADO');
    
    // Verificar todos os memberships
    const allMemberships = await db.collection('memberships').find({}).toArray();
    console.log(`\n📊 Total de memberships no banco: ${allMemberships.length}`);
    
    allMemberships.forEach((membership, index) => {
      console.log(`\n   Membership ${index + 1}:`);
      console.log(`     - ID: ${membership._id}`);
      console.log(`     - User: ${membership.user}`);
      console.log(`     - Tenant: ${membership.tenant}`);
      console.log(`     - Ministry: ${membership.ministry}`);
      console.log(`     - Branch: ${membership.branch}`);
      console.log(`     - Role: ${membership.role}`);
      console.log(`     - isActive: ${membership.isActive}`);
    });
    
    // Verificar memberships com este ministério
    const ministryMemberships = await db.collection('memberships').find({
      ministry: new ObjectId(ministryId)
    }).toArray();
    console.log(`\n🎯 Memberships com este ministério: ${ministryMemberships.length}`);
    
    ministryMemberships.forEach((membership, index) => {
      console.log(`\n   Membership ${index + 1}:`);
      console.log(`     - ID: ${membership._id}`);
      console.log(`     - User: ${membership.user}`);
      console.log(`     - Tenant: ${membership.tenant}`);
      console.log(`     - Ministry: ${membership.ministry}`);
      console.log(`     - Role: ${membership.role}`);
      console.log(`     - isActive: ${membership.isActive}`);
    });
    
    // Verificar memberships com este tenant
    const tenantMemberships = await db.collection('memberships').find({
      tenant: new ObjectId(tenantId)
    }).toArray();
    console.log(`\n🏢 Memberships com este tenant: ${tenantMemberships.length}`);
    
    tenantMemberships.forEach((membership, index) => {
      console.log(`\n   Membership ${index + 1}:`);
      console.log(`     - ID: ${membership._id}`);
      console.log(`     - User: ${membership.user}`);
      console.log(`     - Tenant: ${membership.tenant}`);
      console.log(`     - Ministry: ${membership.ministry}`);
      console.log(`     - Role: ${membership.role}`);
      console.log(`     - isActive: ${membership.isActive}`);
    });
    
    // Verificar memberships com este tenant E ministério
    const filteredMemberships = await db.collection('memberships').find({
      tenant: new ObjectId(tenantId),
      ministry: new ObjectId(ministryId),
      isActive: true
    }).toArray();
    console.log(`\n🎯 Memberships filtrados (tenant + ministry + active): ${filteredMemberships.length}`);
    
    filteredMemberships.forEach((membership, index) => {
      console.log(`\n   Membership ${index + 1}:`);
      console.log(`     - ID: ${membership._id}`);
      console.log(`     - User: ${membership.user}`);
      console.log(`     - Tenant: ${membership.tenant}`);
      console.log(`     - Ministry: ${membership.ministry}`);
      console.log(`     - Role: ${membership.role}`);
      console.log(`     - isActive: ${membership.isActive}`);
    });
    
    // Verificar se há userfunctions para este ministério
    const userFunctions = await db.collection('userfunctions').find({
      ministryId: new ObjectId(ministryId)
    }).toArray();
    console.log(`\n⚙️ UserFunctions com este ministério: ${userFunctions.length}`);
    
    userFunctions.forEach((uf, index) => {
      console.log(`\n   UserFunction ${index + 1}:`);
      console.log(`     - ID: ${uf._id}`);
      console.log(`     - User: ${uf.userId}`);
      console.log(`     - Ministry: ${uf.ministryId}`);
      console.log(`     - Function: ${uf.functionId}`);
      console.log(`     - Status: ${uf.status}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

checkMinistryMembers();
