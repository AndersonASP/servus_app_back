const { MongoClient } = require('mongodb');

async function checkFunctionsTenantId() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Verificar funções com tenantId como string
    const functions = await db.collection('functions').find().toArray();
    console.log(`\n📊 Total de Functions: ${functions.length}`);
    
    let stringTenantIdCount = 0;
    let objectIdTenantIdCount = 0;
    
    console.log('\n🔍 Verificando tenantId das funções:');
    functions.forEach((func, index) => {
      console.log(`\n   Função ${index + 1}:`);
      console.log(`     - ID: ${func._id}`);
      console.log(`     - Nome: ${func.name}`);
      console.log(`     - tenantId: ${func.tenantId}`);
      console.log(`     - Tipo do tenantId: ${typeof func.tenantId}`);
      
      if (typeof func.tenantId === 'string') {
        stringTenantIdCount++;
        console.log(`     - ⚠️  PROBLEMA: tenantId é string!`);
      } else if (func.tenantId && func.tenantId.constructor && func.tenantId.constructor.name === 'ObjectId') {
        objectIdTenantIdCount++;
        console.log(`     - ✅ OK: tenantId é ObjectId`);
      } else {
        console.log(`     - ❓ DESCONHECIDO: tipo ${typeof func.tenantId}`);
      }
    });
    
    console.log('\n📋 Resumo:');
    console.log(`   - Funções com tenantId como string: ${stringTenantIdCount}`);
    console.log(`   - Funções com tenantId como ObjectId: ${objectIdTenantIdCount}`);
    console.log(`   - Total: ${functions.length}`);
    
    if (stringTenantIdCount > 0) {
      console.log('\n⚠️  ATENÇÃO: Existem funções com tenantId como string!');
      console.log('   Isso pode causar problemas nas consultas.');
    } else {
      console.log('\n✅ Todas as funções têm tenantId como ObjectId!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

checkFunctionsTenantId();
