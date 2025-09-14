const { MongoClient, ObjectId } = require('mongodb');

async function checkFunctionReferences() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Buscar todas as funções
    const functions = await db.collection('functions').find({}).toArray();
    console.log(`\n📊 Total de Functions: ${functions.length}`);
    
    functions.forEach((func, index) => {
      console.log(`\n   Function ${index + 1}:`);
      console.log(`     - ID: ${func._id}`);
      console.log(`     - Nome: ${func.name}`);
      console.log(`     - Slug: ${func.slug}`);
      console.log(`     - tenantId: ${func.tenantId}`);
      console.log(`     - isActive: ${func.isActive}`);
    });
    
    // Buscar todas as userfunctions
    const userFunctions = await db.collection('userfunctions').find({}).toArray();
    console.log(`\n📊 Total de UserFunctions: ${userFunctions.length}`);
    
    const functionIds = functions.map(f => f._id.toString());
    console.log(`\n🔍 Function IDs disponíveis: ${functionIds.join(', ')}`);
    
    let validReferences = 0;
    let invalidReferences = 0;
    
    userFunctions.forEach((uf, index) => {
      console.log(`\n   UserFunction ${index + 1}:`);
      console.log(`     - ID: ${uf._id}`);
      console.log(`     - functionId: ${uf.functionId}`);
      console.log(`     - functionId tipo: ${typeof uf.functionId}`);
      
      if (uf.functionId) {
        const functionIdStr = uf.functionId.toString();
        if (functionIds.includes(functionIdStr)) {
          validReferences++;
          console.log(`     - ✅ Referência válida`);
          
          // Buscar a função específica
          const referencedFunction = functions.find(f => f._id.toString() === functionIdStr);
          if (referencedFunction) {
            console.log(`     - Função referenciada: ${referencedFunction.name} (${referencedFunction.slug})`);
          }
        } else {
          invalidReferences++;
          console.log(`     - ❌ Referência inválida - Function não existe`);
        }
      } else {
        invalidReferences++;
        console.log(`     - ❌ functionId é null/undefined`);
      }
    });
    
    console.log(`\n📋 Resumo das referências:`);
    console.log(`   - Referências válidas: ${validReferences}`);
    console.log(`   - Referências inválidas: ${invalidReferences}`);
    console.log(`   - Total: ${userFunctions.length}`);
    
    // Testar populate manual
    console.log(`\n🔍 Testando populate manual...`);
    for (const uf of userFunctions) {
      if (uf.functionId) {
        try {
          const functionId = new ObjectId(uf.functionId);
          const populatedFunction = await db.collection('functions').findOne({ _id: functionId });
          console.log(`   - UserFunction ${uf._id}:`);
          console.log(`     - functionId: ${uf.functionId}`);
          console.log(`     - Populate result: ${populatedFunction ? populatedFunction.name : 'NULL'}`);
        } catch (error) {
          console.log(`   - UserFunction ${uf._id}: ERRO no populate - ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

checkFunctionReferences();
