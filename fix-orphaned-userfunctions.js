const { MongoClient, ObjectId } = require('mongodb');

async function fixOrphanedUserFunctions() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Buscar userfunctions órfãs
    const userFunctions = await db.collection('userfunctions').find({}).toArray();
    console.log(`\n📊 Total de UserFunctions: ${userFunctions.length}`);
    
    // Buscar funções existentes
    const existingFunctions = await db.collection('functions').find({}).toArray();
    const existingFunctionIds = existingFunctions.map(f => f._id.toString());
    console.log(`\n📊 Funções existentes: ${existingFunctionIds.join(', ')}`);
    
    // Identificar userfunctions órfãs
    const orphanedUserFunctions = [];
    const validUserFunctions = [];
    
    userFunctions.forEach(uf => {
      const functionIdStr = uf.functionId.toString();
      if (!existingFunctionIds.includes(functionIdStr)) {
        orphanedUserFunctions.push(uf);
      } else {
        validUserFunctions.push(uf);
      }
    });
    
    console.log(`\n🔍 Análise:`);
    console.log(`   - UserFunctions válidas: ${validUserFunctions.length}`);
    console.log(`   - UserFunctions órfãs: ${orphanedUserFunctions.length}`);
    
    if (orphanedUserFunctions.length > 0) {
      console.log(`\n⚠️  UserFunctions órfãs encontradas:`);
      orphanedUserFunctions.forEach(uf => {
        console.log(`   - ID: ${uf._id}`);
        console.log(`     - functionId: ${uf.functionId}`);
        console.log(`     - status: ${uf.status}`);
        console.log(`     - userId: ${uf.userId}`);
        console.log(`     - ministryId: ${uf.ministryId}`);
      });
      
      // Opção 1: Deletar userfunctions órfãs
      console.log(`\n🗑️  Deletando userfunctions órfãs...`);
      const deleteResult = await db.collection('userfunctions').deleteMany({
        _id: { $in: orphanedUserFunctions.map(uf => uf._id) }
      });
      console.log(`   - ${deleteResult.deletedCount} userfunctions deletadas`);
      
      // Opção 2: Criar funções que estão faltando (comentado por enquanto)
      /*
      console.log(`\n🔧 Criando funções que estão faltando...`);
      const missingFunctionIds = [...new Set(orphanedUserFunctions.map(uf => uf.functionId.toString()))];
      
      for (const functionIdStr of missingFunctionIds) {
        const functionId = new ObjectId(functionIdStr);
        const newFunction = {
          _id: functionId,
          name: 'Função Recuperada',
          slug: 'funcao_recuperada',
          category: 'Recuperada',
          description: 'Função criada automaticamente para corrigir referências órfãs',
          isActive: true,
          tenantId: new ObjectId('68c5b64ebd9cd3a1aaaf879a'),
          createdBy: new ObjectId('68c5b64ebd9cd3a1aaaf879c'),
          aliases: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        try {
          await db.collection('functions').insertOne(newFunction);
          console.log(`   ✅ Função criada: ${functionIdStr}`);
        } catch (error) {
          console.log(`   ❌ Erro ao criar função ${functionIdStr}: ${error.message}`);
        }
      }
      */
    }
    
    // Verificar resultado final
    console.log(`\n🔍 Verificação final...`);
    const finalUserFunctions = await db.collection('userfunctions').find({}).toArray();
    const finalFunctions = await db.collection('functions').find({}).toArray();
    
    console.log(`   - UserFunctions restantes: ${finalUserFunctions.length}`);
    console.log(`   - Functions disponíveis: ${finalFunctions.length}`);
    
    // Verificar se ainda há referências órfãs
    const finalFunctionIds = finalFunctions.map(f => f._id.toString());
    let stillOrphaned = 0;
    
    finalUserFunctions.forEach(uf => {
      const functionIdStr = uf.functionId.toString();
      if (!finalFunctionIds.includes(functionIdStr)) {
        stillOrphaned++;
      }
    });
    
    if (stillOrphaned === 0) {
      console.log(`\n✅ SUCESSO! Todas as referências estão válidas agora!`);
    } else {
      console.log(`\n⚠️  Ainda existem ${stillOrphaned} referências órfãs.`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

fixOrphanedUserFunctions();
