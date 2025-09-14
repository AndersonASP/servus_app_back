const { MongoClient } = require('mongodb');

async function checkAllTenantId() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Listar todas as coleções
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Coleções disponíveis:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Verificar cada coleção que pode ter tenantId
    const collectionsToCheck = ['functions', 'ministries', 'ministryfunctions', 'userfunctions', 'memberships', 'users'];
    
    for (const collectionName of collectionsToCheck) {
      const collectionExists = collections.some(col => col.name === collectionName);
      if (!collectionExists) {
        console.log(`\n⚠️  Coleção '${collectionName}' não existe`);
        continue;
      }
      
      console.log(`\n🔍 Verificando coleção: ${collectionName}`);
      
      const docs = await db.collection(collectionName).find({}).limit(5).toArray();
      console.log(`   - Total de documentos: ${await db.collection(collectionName).countDocuments()}`);
      console.log(`   - Amostra (primeiros 5):`);
      
      let stringTenantIdCount = 0;
      let objectIdTenantIdCount = 0;
      
      docs.forEach((doc, index) => {
        if (doc.tenantId !== undefined) {
          console.log(`     Doc ${index + 1}:`);
          console.log(`       - ID: ${doc._id}`);
          console.log(`       - tenantId: ${doc.tenantId}`);
          console.log(`       - Tipo: ${typeof doc.tenantId}`);
          
          if (typeof doc.tenantId === 'string') {
            stringTenantIdCount++;
            console.log(`       - ⚠️  PROBLEMA: string!`);
          } else if (doc.tenantId && doc.tenantId.constructor && doc.tenantId.constructor.name === 'ObjectId') {
            objectIdTenantIdCount++;
            console.log(`       - ✅ OK: ObjectId`);
          } else {
            console.log(`       - ❓ DESCONHECIDO`);
          }
        } else {
          console.log(`     Doc ${index + 1}: Sem tenantId`);
        }
      });
      
      // Verificar todos os documentos da coleção
      const allDocs = await db.collection(collectionName).find({}).toArray();
      let totalStringCount = 0;
      let totalObjectIdCount = 0;
      
      allDocs.forEach(doc => {
        if (doc.tenantId !== undefined) {
          if (typeof doc.tenantId === 'string') {
            totalStringCount++;
          } else if (doc.tenantId && doc.tenantId.constructor && doc.tenantId.constructor.name === 'ObjectId') {
            totalObjectIdCount++;
          }
        }
      });
      
      console.log(`   - Resumo da coleção:`);
      console.log(`     * Com tenantId como string: ${totalStringCount}`);
      console.log(`     * Com tenantId como ObjectId: ${totalObjectIdCount}`);
      
      if (totalStringCount > 0) {
        console.log(`     ⚠️  PROBLEMA: ${totalStringCount} documentos com tenantId como string!`);
      } else {
        console.log(`     ✅ OK: Todos os tenantId são ObjectId`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

checkAllTenantId();
