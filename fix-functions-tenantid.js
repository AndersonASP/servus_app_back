const { MongoClient, ObjectId } = require('mongodb');

async function fixFunctionsTenantId() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Buscar funções com tenantId como string
    const functions = await db.collection('functions').find({}).toArray();
    console.log(`\n📊 Total de Functions encontradas: ${functions.length}`);
    
    let fixedCount = 0;
    
    for (const func of functions) {
      if (typeof func.tenantId === 'string') {
        console.log(`\n🔧 Corrigindo função: ${func.name} (${func._id})`);
        console.log(`   - tenantId atual: ${func.tenantId} (string)`);
        
        // Converter string para ObjectId
        const objectIdTenantId = new ObjectId(func.tenantId);
        console.log(`   - tenantId novo: ${objectIdTenantId} (ObjectId)`);
        
        // Atualizar no banco
        const result = await db.collection('functions').updateOne(
          { _id: func._id },
          { $set: { tenantId: objectIdTenantId } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`   ✅ Função corrigida com sucesso!`);
          fixedCount++;
        } else {
          console.log(`   ❌ Falha ao corrigir função`);
        }
      } else {
        console.log(`\n✅ Função ${func.name} já tem tenantId como ObjectId`);
      }
    }
    
    console.log(`\n📋 Resumo da correção:`);
    console.log(`   - Funções corrigidas: ${fixedCount}`);
    console.log(`   - Total processadas: ${functions.length}`);
    
    // Verificar se a correção funcionou
    console.log(`\n🔍 Verificando correção...`);
    const updatedFunctions = await db.collection('functions').find({}).toArray();
    let stringCount = 0;
    let objectIdCount = 0;
    
    updatedFunctions.forEach(func => {
      if (typeof func.tenantId === 'string') {
        stringCount++;
      } else if (func.tenantId && func.tenantId.constructor && func.tenantId.constructor.name === 'ObjectId') {
        objectIdCount++;
      }
    });
    
    console.log(`   - Funções com tenantId como string: ${stringCount}`);
    console.log(`   - Funções com tenantId como ObjectId: ${objectIdCount}`);
    
    if (stringCount === 0) {
      console.log(`\n🎉 SUCESSO! Todas as funções agora têm tenantId como ObjectId!`);
    } else {
      console.log(`\n⚠️  Ainda existem ${stringCount} funções com tenantId como string.`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

fixFunctionsTenantId();
