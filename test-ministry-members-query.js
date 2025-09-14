const { MongoClient, ObjectId } = require('mongodb');

async function testMinistryMembersQuery() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    const ministryId = '68c5b81fbd9cd3a1aaaf87bd';
    
    console.log(`\n🔍 Testando query para ministério ${ministryId}`);
    
    // Query exata que o serviço está usando
    const query = {
      ministry: new ObjectId(ministryId),
      isActive: true
    };
    
    console.log('📋 Query:', JSON.stringify(query, null, 2));
    
    // Executar a query
    const memberships = await db.collection('memberships')
      .find(query)
      .toArray();
    
    console.log(`\n📊 Resultado: ${memberships.length} membros encontrados`);
    
    if (memberships.length > 0) {
      console.log('\n📋 Membros encontrados:');
      memberships.forEach((membership, index) => {
        console.log(`\n   Membership ${index + 1}:`);
        console.log(`     - ID: ${membership._id}`);
        console.log(`     - User: ${membership.user}`);
        console.log(`     - Ministry: ${membership.ministry}`);
        console.log(`     - Role: ${membership.role}`);
        console.log(`     - isActive: ${membership.isActive}`);
      });
    } else {
      console.log('\n❌ Nenhum membro encontrado');
      
      // Verificar se o ministério existe
      const ministry = await db.collection('ministries').findOne({ _id: new ObjectId(ministryId) });
      console.log(`\n🔍 Ministério existe: ${ministry ? 'SIM' : 'NÃO'}`);
      if (ministry) {
        console.log(`   - Nome: ${ministry.name}`);
        console.log(`   - ID: ${ministry._id}`);
      }
      
      // Verificar todos os memberships
      const allMemberships = await db.collection('memberships').find({}).toArray();
      console.log(`\n📊 Total de memberships: ${allMemberships.length}`);
      
      allMemberships.forEach((membership, index) => {
        console.log(`\n   Membership ${index + 1}:`);
        console.log(`     - ID: ${membership._id}`);
        console.log(`     - User: ${membership.user}`);
        console.log(`     - Ministry: ${membership.ministry}`);
        console.log(`     - Ministry type: ${typeof membership.ministry}`);
        console.log(`     - Ministry is ObjectId: ${membership.ministry instanceof ObjectId}`);
        console.log(`     - Role: ${membership.role}`);
        console.log(`     - isActive: ${membership.isActive}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

testMinistryMembersQuery();
