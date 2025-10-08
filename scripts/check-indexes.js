const { MongoClient } = require('mongodb');

async function checkIndexes() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Conectado ao MongoDB');
    
    const db = client.db('servus');
    const collection = db.collection('volunteeravailabilities');
    
    // Listar todos os índices
    const indexes = await collection.indexes();
    
    console.log('\nÍndices existentes:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key, null, 2));
      if (index.unique) {
        console.log('   ✅ ÚNICO');
      }
    });
    
    // Verificar documentos existentes
    const count = await collection.countDocuments();
    console.log(`\nTotal de documentos: ${count}`);
    
    if (count > 0) {
      const sample = await collection.findOne();
      console.log('\nExemplo de documento:');
      console.log(JSON.stringify(sample, null, 2));
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.close();
  }
}

checkIndexes();
