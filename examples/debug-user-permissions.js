const { MongoClient } = require('mongodb');

async function debugUserPermissions() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/servus';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB');

    const db = client.db();
    
    // Substitua pelo email do usuário que você está testando
    const userEmail = process.argv[2] || 'admin@servus.com';
    
    console.log(`🔍 Verificando permissões do usuário: ${userEmail}`);
    
    // Buscar usuário
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log('👤 Dados do usuário:');
    console.log(`   - ID: ${user._id}`);
    console.log(`   - Nome: ${user.name}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role Global: ${user.role}`);
    
    // Buscar memberships do usuário
    const memberships = await db.collection('memberships')
      .find({ 
        user: user._id,
        isActive: true 
      })
      .populate('tenant')
      .populate('branch')
      .populate('ministry')
      .toArray();
    
    console.log(`\n🔗 Memberships encontrados: ${memberships.length}`);
    
    for (const membership of memberships) {
      console.log('\n📋 Membership:');
      console.log(`   - ID: ${membership._id}`);
      console.log(`   - Role: ${membership.role}`);
      console.log(`   - Tenant: ${membership.tenant?.tenantId || 'N/A'}`);
      console.log(`   - Branch: ${membership.branch?.branchId || 'N/A'}`);
      console.log(`   - Ministry: ${membership.ministry?.name || 'N/A'}`);
      console.log(`   - Ativo: ${membership.isActive}`);
    }
    
    // Verificar permissões específicas para a rota de voluntários
    console.log('\n🔐 Verificando permissões para rota de voluntários...');
    
    // Substitua pelos IDs reais do seu tenant e ministry
    const tenantId = process.argv[3] || 'test-tenant-123';
    const ministryId = process.argv[4] || 'test-ministry-789';
    
    console.log(`   - Tenant ID: ${tenantId}`);
    console.log(`   - Ministry ID: ${ministryId}`);
    
    // Buscar tenant
    const tenant = await db.collection('tenants').findOne({ tenantId });
    if (!tenant) {
      console.log('❌ Tenant não encontrado');
      return;
    }
    
    // Buscar ministry
    const ministry = await db.collection('ministries').findOne({ _id: ministryId });
    if (!ministry) {
      console.log('❌ Ministry não encontrado');
      return;
    }
    
    console.log('✅ Tenant e Ministry encontrados');
    
    // Verificar se o usuário tem membership adequado
    const hasPermission = memberships.some(membership => {
      const isCorrectTenant = membership.tenant?.toString() === tenant._id.toString();
      const hasCorrectRole = ['tenant_admin', 'branch_admin', 'leader'].includes(membership.role);
      
      return isCorrectTenant && hasCorrectRole;
    });
    
    if (hasPermission) {
      console.log('✅ Usuário TEM permissão para acessar a rota de voluntários');
    } else {
      console.log('❌ Usuário NÃO TEM permissão para acessar a rota de voluntários');
      console.log('   - Precisa ter role: tenant_admin, branch_admin ou leader');
      console.log('   - Precisa ter membership no tenant correto');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexão com MongoDB fechada');
  }
}

// Uso: node debug-user-permissions.js <email> <tenantId> <ministryId>
debugUserPermissions();
