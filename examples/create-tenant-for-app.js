const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/?retryWrites=true&w=majority&appName=ServusCluster0";

async function createTenantForApp() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB');
    
    const db = client.db('servus');
    const tenantsCollection = db.collection('tenants');
    
    // Tenant ID que o app está tentando usar
    const tenantId = '0199107c-56a7-7098-9d81-9744d7a815e9';
    
    // Verificar se já existe
    const existingTenant = await tenantsCollection.findOne({ tenantId: tenantId });
    
    if (existingTenant) {
      console.log('✅ Tenant já existe:', existingTenant.name);
      
      // Ativar feature flag se não estiver ativa
      if (!existingTenant.features?.functionsByMinistry) {
        await tenantsCollection.updateOne(
          { tenantId: tenantId },
          { $set: { 'features.functionsByMinistry': true } }
        );
        console.log('✅ Feature flag ativada');
      } else {
        console.log('✅ Feature flag já está ativa');
      }
    } else {
      console.log('❌ Tenant não encontrado. Criando...');
      
      const newTenant = {
        tenantId: tenantId,
        slug: tenantId, // Usar o mesmo ID como slug
        name: 'Tenant do App',
        isActive: true,
        features: {
          functionsByMinistry: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await tenantsCollection.insertOne(newTenant);
      console.log('✅ Tenant criado com sucesso!');
    }
    
    // Verificar se foi criado
    const tenant = await tenantsCollection.findOne({ tenantId: tenantId });
    console.log('\n📊 Tenant configurado:');
    console.log('- ID:', tenant.tenantId);
    console.log('- Slug:', tenant.slug);
    console.log('- Nome:', tenant.name);
    console.log('- Ativo:', tenant.isActive);
    console.log('- Feature Flag:', tenant.features?.functionsByMinistry);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

createTenantForApp();
