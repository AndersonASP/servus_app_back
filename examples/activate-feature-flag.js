const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/?retryWrites=true&w=majority&appName=ServusCluster0";
const client = new MongoClient(uri);

async function activateFeatureFlag() {
  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB');

    const db = client.db('servus');
    const tenantsCollection = db.collection('tenants');

    // Ativar feature flag para o tenant 'test'
    const result = await tenantsCollection.updateOne(
      { tenantId: 'test' },
      { 
        $set: { 
          'features.functionsByMinistry': true 
        } 
      }
    );

    if (result.matchedCount > 0) {
      console.log('✅ Feature flag ativada com sucesso!');
      
      // Verificar se foi ativada
      const tenant = await tenantsCollection.findOne({ tenantId: 'test' });
      console.log('📋 Status da feature flag:', tenant.features?.functionsByMinistry);
    } else {
      console.log('❌ Tenant "test" não encontrado');
    }

  } catch (error) {
    console.error('❌ Erro ao ativar feature flag:', error);
  } finally {
    await client.close();
  }
}

activateFeatureFlag();
