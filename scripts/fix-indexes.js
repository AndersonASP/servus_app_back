const { MongoClient, ObjectId } = require('mongodb');

async function fixIndexes() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Conectado ao MongoDB');
    
    const db = client.db('servus');
    const collection = db.collection('volunteeravailabilities');
    
    // Verificar se a coleção existe
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === 'volunteeravailabilities');
    
    if (!collectionExists) {
      console.log('Coleção não existe, criando...');
      // Criar coleção vazia para forçar criação dos índices
      await collection.insertOne({
        _id: new ObjectId(),
        userId: new ObjectId(),
        ministryId: new ObjectId(),
        tenantId: new ObjectId(),
        blockedDates: [],
        maxBlockedDaysPerMonth: 30,
        isActive: true,
        lastUpdated: new Date(),
      });
      
      // Remover documento de teste
      await collection.deleteMany({});
      console.log('Coleção criada com sucesso');
    }
    
    // Listar índices existentes
    const indexes = await collection.indexes();
    console.log('\nÍndices existentes:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key, null, 2));
      if (index.unique) {
        console.log('   ✅ ÚNICO');
      }
    });
    
    // Remover índice antigo problemático
    const oldIndexName = 'userId_1_ministryId_1';
    const hasOldIndex = indexes.some(idx => idx.name === oldIndexName);
    
    if (hasOldIndex) {
      console.log(`\nRemovendo índice antigo: ${oldIndexName}`);
      await collection.dropIndex(oldIndexName);
      console.log('✅ Índice antigo removido');
    }
    
    // Criar novo índice correto
    const newIndexName = 'user_ministry_tenant_unique';
    const hasNewIndex = indexes.some(idx => idx.name === newIndexName);
    
    if (!hasNewIndex) {
      console.log(`\nCriando novo índice: ${newIndexName}`);
      await collection.createIndex(
        { userId: 1, ministryId: 1, tenantId: 1 },
        { 
          unique: true,
          name: newIndexName,
          background: true
        }
      );
      console.log('✅ Novo índice criado');
    }
    
    // Listar índices finais
    const finalIndexes = await collection.indexes();
    console.log('\nÍndices finais:');
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key, null, 2));
      if (index.unique) {
        console.log('   ✅ ÚNICO');
      }
    });
    
    console.log('\n✅ Correção de índices concluída!');
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.close();
  }
}

fixIndexes();
