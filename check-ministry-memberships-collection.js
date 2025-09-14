const { MongoClient, ObjectId } = require('mongodb');

async function checkMinistryMembershipsCollection() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Verificar se a coleção ministrymemberships existe
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Coleções disponíveis:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Verificar se existe a coleção ministrymemberships
    const ministryMembershipsExists = collections.some(col => col.name === 'ministrymemberships');
    console.log(`\n🔍 Coleção 'ministrymemberships' existe: ${ministryMembershipsExists}`);
    
    if (ministryMembershipsExists) {
      const ministryMemberships = await db.collection('ministrymemberships').find({}).toArray();
      console.log(`\n📊 Total de documentos em 'ministrymemberships': ${ministryMemberships.length}`);
      
      if (ministryMemberships.length > 0) {
        console.log('\n📋 Documentos em ministrymemberships:');
        ministryMemberships.forEach((doc, index) => {
          console.log(`\n   Documento ${index + 1}:`);
          console.log(`     - ID: ${doc._id}`);
          console.log(`     - userId: ${doc.userId}`);
          console.log(`     - ministryId: ${doc.ministryId}`);
          console.log(`     - role: ${doc.role}`);
          console.log(`     - isActive: ${doc.isActive}`);
        });
      }
    }
    
    // Verificar se existe a coleção memberships
    const membershipsExists = collections.some(col => col.name === 'memberships');
    console.log(`\n🔍 Coleção 'memberships' existe: ${membershipsExists}`);
    
    if (membershipsExists) {
      const memberships = await db.collection('memberships').find({}).toArray();
      console.log(`\n📊 Total de documentos em 'memberships': ${memberships.length}`);
      
      // Filtrar apenas os que têm ministry
      const membershipsWithMinistry = memberships.filter(m => m.ministry);
      console.log(`\n📊 Memberships com ministry: ${membershipsWithMinistry.length}`);
      
      if (membershipsWithMinistry.length > 0) {
        console.log('\n📋 Memberships com ministry:');
        membershipsWithMinistry.forEach((doc, index) => {
          console.log(`\n   Membership ${index + 1}:`);
          console.log(`     - ID: ${doc._id}`);
          console.log(`     - userId: ${doc.user}`);
          console.log(`     - ministryId: ${doc.ministry}`);
          console.log(`     - role: ${doc.role}`);
          console.log(`     - isActive: ${doc.isActive}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

checkMinistryMembershipsCollection();
