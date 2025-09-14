const { MongoClient, ObjectId } = require('mongodb');

async function createTestFunctions() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Criar funções de teste
    const testFunctions = [
      {
        name: 'baixista',
        slug: 'baixista',
        category: 'Música',
        description: 'Toca o instrumento baixo',
        isActive: true,
        tenantId: new ObjectId('68c5b64ebd9cd3a1aaaf879a'),
        createdBy: new ObjectId('68c5b64ebd9cd3a1aaaf879c'),
        aliases: ['baixo', 'bassista'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'tecladista',
        slug: 'tecladista',
        category: 'Música',
        description: 'Toca teclado/piano',
        isActive: true,
        tenantId: new ObjectId('68c5b64ebd9cd3a1aaaf879a'),
        createdBy: new ObjectId('68c5b64ebd9cd3a1aaaf879c'),
        aliases: ['pianista', 'teclado'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    console.log(`\n🔧 Criando ${testFunctions.length} funções de teste...`);
    
    const createdFunctions = [];
    for (const func of testFunctions) {
      try {
        const result = await db.collection('functions').insertOne(func);
        createdFunctions.push({ ...func, _id: result.insertedId });
        console.log(`   ✅ Função criada: ${func.name} (${result.insertedId})`);
      } catch (error) {
        console.log(`   ❌ Erro ao criar função ${func.name}: ${error.message}`);
      }
    }
    
    // Criar userfunctions de teste
    if (createdFunctions.length > 0) {
      console.log(`\n🔧 Criando userfunctions de teste...`);
      
      const testUserFunctions = [
        {
          userId: new ObjectId('68c5bbf6bd9cd3a1aaaf8865'),
          ministryId: new ObjectId('68c5b81fbd9cd3a1aaaf87bd'),
          functionId: createdFunctions[0]._id, // baixista
          status: 'approved',
          approvedBy: new ObjectId('68c5b64ebd9cd3a1aaaf879c'),
          approvedAt: new Date(),
          notes: 'Aprovado pelo líder do ministério',
          tenantId: new ObjectId('68c5b64ebd9cd3a1aaaf879a'),
          branchId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          userId: new ObjectId('68c5bbf6bd9cd3a1aaaf8865'),
          ministryId: new ObjectId('68c5b81fbd9cd3a1aaaf87bd'),
          functionId: createdFunctions[1]._id, // tecladista
          status: 'approved',
          approvedBy: new ObjectId('68c5b64ebd9cd3a1aaaf879c'),
          approvedAt: new Date(),
          notes: 'Aprovado pelo líder do ministério',
          tenantId: new ObjectId('68c5b64ebd9cd3a1aaaf879a'),
          branchId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      for (const uf of testUserFunctions) {
        try {
          const result = await db.collection('userfunctions').insertOne(uf);
          console.log(`   ✅ UserFunction criada: ${result.insertedId}`);
        } catch (error) {
          console.log(`   ❌ Erro ao criar userfunction: ${error.message}`);
        }
      }
    }
    
    // Verificar resultado final
    console.log(`\n🔍 Verificação final...`);
    const finalFunctions = await db.collection('functions').find({}).toArray();
    const finalUserFunctions = await db.collection('userfunctions').find({}).toArray();
    
    console.log(`   - Functions disponíveis: ${finalFunctions.length}`);
    console.log(`   - UserFunctions disponíveis: ${finalUserFunctions.length}`);
    
    console.log(`\n📋 Functions criadas:`);
    finalFunctions.forEach(func => {
      console.log(`   - ${func.name} (${func._id})`);
    });
    
    console.log(`\n📋 UserFunctions criadas:`);
    finalUserFunctions.forEach(uf => {
      console.log(`   - UserFunction ${uf._id} -> Function ${uf.functionId}`);
    });
    
    console.log(`\n✅ Dados de teste criados com sucesso!`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

createTestFunctions();
