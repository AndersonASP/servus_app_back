const { MongoClient } = require('mongodb');

async function checkNullFunctionId() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Verificar userfunctions com functionId null
    const userFunctions = await db.collection('userfunctions').find({}).toArray();
    console.log(`\n📊 Total de UserFunctions: ${userFunctions.length}`);
    
    let nullFunctionIdCount = 0;
    let validFunctionIdCount = 0;
    
    console.log('\n🔍 Verificando functionId das userfunctions:');
    userFunctions.forEach((uf, index) => {
      console.log(`\n   UserFunction ${index + 1}:`);
      console.log(`     - ID: ${uf._id}`);
      console.log(`     - userId: ${uf.userId}`);
      console.log(`     - ministryId: ${uf.ministryId}`);
      console.log(`     - functionId: ${uf.functionId}`);
      console.log(`     - status: ${uf.status}`);
      
      if (uf.functionId === null || uf.functionId === undefined) {
        nullFunctionIdCount++;
        console.log(`     - ⚠️  PROBLEMA: functionId é null/undefined!`);
      } else {
        validFunctionIdCount++;
        console.log(`     - ✅ OK: functionId válido`);
      }
    });
    
    console.log('\n📋 Resumo:');
    console.log(`   - UserFunctions com functionId null: ${nullFunctionIdCount}`);
    console.log(`   - UserFunctions com functionId válido: ${validFunctionIdCount}`);
    console.log(`   - Total: ${userFunctions.length}`);
    
    if (nullFunctionIdCount > 0) {
      console.log('\n⚠️  ATENÇÃO: Existem userfunctions com functionId null!');
      console.log('   Isso pode causar erros no mapeamento.');
      
      // Verificar se as funções referenciadas existem
      console.log('\n🔍 Verificando se as funções referenciadas existem...');
      const functions = await db.collection('functions').find({}).toArray();
      console.log(`   - Total de Functions no banco: ${functions.length}`);
      
      const functionIds = functions.map(f => f._id.toString());
      console.log(`   - Function IDs disponíveis: ${functionIds.join(', ')}`);
      
      // Verificar se algum functionId das userfunctions não existe
      const invalidReferences = [];
      userFunctions.forEach(uf => {
        if (uf.functionId && !functionIds.includes(uf.functionId.toString())) {
          invalidReferences.push({
            userFunctionId: uf._id,
            functionId: uf.functionId,
            status: uf.status
          });
        }
      });
      
      if (invalidReferences.length > 0) {
        console.log(`\n❌ Referências inválidas encontradas: ${invalidReferences.length}`);
        invalidReferences.forEach(ref => {
          console.log(`   - UserFunction ${ref.userFunctionId} referencia Function ${ref.functionId} que não existe`);
        });
      } else {
        console.log(`\n✅ Todas as referências de functionId são válidas`);
      }
    } else {
      console.log('\n✅ Todas as userfunctions têm functionId válido!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

checkNullFunctionId();
