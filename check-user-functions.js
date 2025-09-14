const { MongoClient } = require('mongodb');

async function checkUserFunctions() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Verificar se existe coleção userfunctions
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Coleções disponíveis:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Verificar se existe userfunctions
    const userFunctionsExists = collections.some(col => col.name === 'userfunctions');
    console.log(`\n🔍 Coleção 'userfunctions' existe: ${userFunctionsExists ? '✅' : '❌'}`);
    
    if (userFunctionsExists) {
      // Contar documentos
      const count = await db.collection('userfunctions').countDocuments();
      console.log(`📊 Total de UserFunctions: ${count}`);
      
      // Buscar alguns exemplos
      const userFunctions = await db.collection('userfunctions').find().limit(5).toArray();
      console.log('\n👤 UserFunctions encontradas:');
      userFunctions.forEach(uf => {
        console.log(`   - ID: ${uf._id}`);
        console.log(`     - userId: ${uf.userId}`);
        console.log(`     - ministryId: ${uf.ministryId}`);
        console.log(`     - functionId: ${uf.functionId}`);
        console.log(`     - status: ${uf.status}`);
        console.log(`     - tenantId: ${uf.tenantId}`);
        console.log('   ---');
      });
    }
    
    // Verificar se existe funções (functions)
    const functionsExists = collections.some(col => col.name === 'functions');
    console.log(`\n🔍 Coleção 'functions' existe: ${functionsExists ? '✅' : '❌'}`);
    
    if (functionsExists) {
      const functionsCount = await db.collection('functions').countDocuments();
      console.log(`📊 Total de Functions: ${functionsCount}`);
      
      const functions = await db.collection('functions').find().limit(3).toArray();
      console.log('\n⚙️ Functions encontradas:');
      functions.forEach(f => {
        console.log(`   - ID: ${f._id}`);
        console.log(`     - name: ${f.name}`);
        console.log(`     - description: ${f.description}`);
        console.log('   ---');
      });
    }
    
    // Verificar se existe ministryfunctions
    const ministryFunctionsExists = collections.some(col => col.name === 'ministryfunctions');
    console.log(`\n🔍 Coleção 'ministryfunctions' existe: ${ministryFunctionsExists ? '✅' : '❌'}`);
    
    if (ministryFunctionsExists) {
      const ministryFunctionsCount = await db.collection('ministryfunctions').countDocuments();
      console.log(`📊 Total de MinistryFunctions: ${ministryFunctionsCount}`);
      
      const ministryFunctions = await db.collection('ministryfunctions').find().limit(3).toArray();
      console.log('\n🏢 MinistryFunctions encontradas:');
      ministryFunctions.forEach(mf => {
        console.log(`   - ID: ${mf._id}`);
        console.log(`     - ministryId: ${mf.ministryId}`);
        console.log(`     - functionId: ${mf.functionId}`);
        console.log(`     - isActive: ${mf.isActive}`);
        console.log('   ---');
      });
    }
    
    // Verificar usuários
    const usersCount = await db.collection('users').countDocuments();
    console.log(`\n👥 Total de Users: ${usersCount}`);
    
    // Verificar ministérios
    const ministriesCount = await db.collection('ministries').countDocuments();
    console.log(`\n⛪ Total de Ministries: ${ministriesCount}`);
    
    // Verificar memberships
    const membershipsCount = await db.collection('memberships').countDocuments();
    console.log(`\n🔗 Total de Memberships: ${membershipsCount}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

checkUserFunctions();
