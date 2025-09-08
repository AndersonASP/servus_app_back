const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/?retryWrites=true&w=majority&appName=ServusCluster0";

async function debugTenantMiddleware() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB');
    
    const db = client.db('servus');
    const tenantsCollection = db.collection('tenants');
    
    // Testar diferentes queries
    const tenantSlug = '0199107c-56a7-7098-9d81-9744d7a815e9';
    
    console.log('\n🔍 Testando queries...');
    
    // Query 1: Por slug
    const tenantBySlug = await tenantsCollection.findOne({ 
      slug: tenantSlug, 
      isActive: true 
    });
    console.log('1. Query por slug:', tenantBySlug ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    
    // Query 2: Por tenantId
    const tenantById = await tenantsCollection.findOne({ 
      tenantId: tenantSlug, 
      isActive: true 
    });
    console.log('2. Query por tenantId:', tenantById ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    
    // Query 3: Apenas por slug (sem isActive)
    const tenantBySlugOnly = await tenantsCollection.findOne({ 
      slug: tenantSlug 
    });
    console.log('3. Query por slug (sem isActive):', tenantBySlugOnly ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    
    // Query 4: Listar todos os tenants
    const allTenants = await tenantsCollection.find({}).toArray();
    console.log('4. Total de tenants:', allTenants.length);
    allTenants.forEach(t => {
      console.log(`   - Slug: "${t.slug}" | TenantId: "${t.tenantId}" | Active: ${t.isActive}`);
    });
    
    // Query 5: Verificar se o tenant específico existe
    const specificTenant = await tenantsCollection.findOne({ 
      $or: [
        { slug: tenantSlug },
        { tenantId: tenantSlug }
      ]
    });
    console.log('5. Tenant específico existe:', specificTenant ? 'SIM' : 'NÃO');
    if (specificTenant) {
      console.log('   - Slug:', specificTenant.slug);
      console.log('   - TenantId:', specificTenant.tenantId);
      console.log('   - IsActive:', specificTenant.isActive);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

debugTenantMiddleware();
