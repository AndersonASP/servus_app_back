const { MongoClient, ObjectId } = require('mongodb');

async function fixMinistryFunctionsTenantId() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Buscar ministryfunctions com tenantId como string
    const ministryFunctions = await db.collection('ministryfunctions').find({}).toArray();
    console.log(`\n📊 Total de MinistryFunctions encontradas: ${ministryFunctions.length}`);
    
    let fixedCount = 0;
    
    for (const mf of ministryFunctions) {
      if (typeof mf.tenantId === 'string') {
        console.log(`\n🔧 Corrigindo ministryfunction: ${mf._id}`);
        console.log(`   - tenantId atual: ${mf.tenantId} (string)`);
        console.log(`   - ministryId: ${mf.ministryId}`);
        console.log(`   - functionId: ${mf.functionId}`);
        
        // Converter string para ObjectId
        const objectIdTenantId = new ObjectId(mf.tenantId);
        console.log(`   - tenantId novo: ${objectIdTenantId} (ObjectId)`);
        
        // Atualizar no banco
        const result = await db.collection('ministryfunctions').updateOne(
          { _id: mf._id },
          { $set: { tenantId: objectIdTenantId } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`   ✅ MinistryFunction corrigida com sucesso!`);
          fixedCount++;
        } else {
          console.log(`   ❌ Falha ao corrigir ministryfunction`);
        }
      } else {
        console.log(`\n✅ MinistryFunction ${mf._id} já tem tenantId como ObjectId`);
      }
    }
    
    console.log(`\n📋 Resumo da correção:`);
    console.log(`   - MinistryFunctions corrigidas: ${fixedCount}`);
    console.log(`   - Total processadas: ${ministryFunctions.length}`);
    
    // Verificar se a correção funcionou
    console.log(`\n🔍 Verificando correção...`);
    const updatedMinistryFunctions = await db.collection('ministryfunctions').find({}).toArray();
    let stringCount = 0;
    let objectIdCount = 0;
    
    updatedMinistryFunctions.forEach(mf => {
      if (typeof mf.tenantId === 'string') {
        stringCount++;
      } else if (mf.tenantId && mf.tenantId.constructor && mf.tenantId.constructor.name === 'ObjectId') {
        objectIdCount++;
      }
    });
    
    console.log(`   - MinistryFunctions com tenantId como string: ${stringCount}`);
    console.log(`   - MinistryFunctions com tenantId como ObjectId: ${objectIdCount}`);
    
    if (stringCount === 0) {
      console.log(`\n🎉 SUCESSO! Todas as ministryfunctions agora têm tenantId como ObjectId!`);
    } else {
      console.log(`\n⚠️  Ainda existem ${stringCount} ministryfunctions com tenantId como string.`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

fixMinistryFunctionsTenantId();
