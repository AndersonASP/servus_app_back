const { MongoClient } = require('mongodb');

async function debugAvailabilityCollection() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Conectado ao MongoDB');
    
    const db = client.db('servus');
    const collection = db.collection('volunteeravailabilities');
    
    // Verificar se a coleção existe
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === 'volunteeravailabilities');
    
    console.log(`Coleção volunteeravailabilities existe: ${collectionExists}`);
    
    if (collectionExists) {
      // Contar documentos
      const count = await collection.countDocuments();
      console.log(`Total de documentos: ${count}`);
      
      if (count > 0) {
        // Mostrar alguns documentos
        const docs = await collection.find({}).limit(3).toArray();
        console.log('\nDocumentos existentes:');
        docs.forEach((doc, i) => {
          console.log(`\n${i + 1}. ID: ${doc._id}`);
          console.log(`   userId: ${doc.userId}`);
          console.log(`   ministryId: ${doc.ministryId}`);
          console.log(`   tenantId: ${doc.tenantId}`);
          console.log(`   blockedDates: ${doc.blockedDates?.length || 0} datas`);
        });
        
        // Verificar índices
        const indexes = await collection.indexes();
        console.log('\nÍndices:');
        indexes.forEach((index, i) => {
          console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key, null, 2));
          if (index.unique) {
            console.log('   ✅ ÚNICO');
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.close();
  }
}

debugAvailabilityCollection();
