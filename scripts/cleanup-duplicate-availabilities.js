const { MongoClient } = require('mongodb');

async function cleanupDuplicateAvailabilities() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Conectado ao MongoDB');
    
    const db = client.db('servus');
    const collection = db.collection('volunteeravailabilities');
    
    // Encontrar documentos duplicados (mesmo userId e ministryId)
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: {
            userId: '$userId',
            ministryId: '$ministryId'
          },
          count: { $sum: 1 },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();
    
    console.log(`Encontrados ${duplicates.length} grupos de documentos duplicados`);
    
    for (const duplicate of duplicates) {
      console.log(`\nProcessando grupo: userId=${duplicate._id.userId}, ministryId=${duplicate._id.ministryId}`);
      
      // Ordenar por data de criação (manter o mais antigo)
      const sortedDocs = duplicate.docs.sort((a, b) => 
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      );
      
      const keepDoc = sortedDocs[0];
      const removeDocs = sortedDocs.slice(1);
      
      console.log(`  Mantendo documento: ${keepDoc._id}`);
      console.log(`  Removendo ${removeDocs.length} documentos duplicados`);
      
      // Consolidar todas as datas bloqueadas no documento que será mantido
      const allBlockedDates = [];
      
      // Adicionar datas do documento que será mantido
      if (keepDoc.blockedDates) {
        allBlockedDates.push(...keepDoc.blockedDates);
      }
      
      // Adicionar datas dos documentos que serão removidos
      for (const doc of removeDocs) {
        if (doc.blockedDates) {
          allBlockedDates.push(...doc.blockedDates);
        }
      }
      
      // Remover datas duplicadas (mesma data)
      const uniqueDates = [];
      const seenDates = new Set();
      
      for (const blockedDate of allBlockedDates) {
        const dateKey = new Date(blockedDate.date).toDateString();
        if (!seenDates.has(dateKey)) {
          seenDates.add(dateKey);
          uniqueDates.push(blockedDate);
        }
      }
      
      // Atualizar o documento mantido com todas as datas consolidadas
      await collection.updateOne(
        { _id: keepDoc._id },
        { 
          $set: { 
            blockedDates: uniqueDates,
            lastUpdated: new Date()
          }
        }
      );
      
      // Remover documentos duplicados
      const removeIds = removeDocs.map(doc => doc._id);
      await collection.deleteMany({ _id: { $in: removeIds } });
      
      console.log(`  ✅ Consolidado ${uniqueDates.length} datas bloqueadas`);
    }
    
    console.log('\n✅ Limpeza concluída!');
    
  } catch (error) {
    console.error('Erro durante a limpeza:', error);
  } finally {
    await client.close();
  }
}

cleanupDuplicateAvailabilities();
