const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createServusAdminAtlas() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    console.log('🚀 Criando Servus Admin no Atlas...');
    console.log('========================');
    
    // 1. Verificar se já existe
    const existingUser = await db.collection('users').findOne({ email: 'servus_admin@servus.com' });
    if (existingUser) {
      console.log('⚠️ Usuário servus_admin já existe!');
      console.log('   - ID:', existingUser._id);
      console.log('   - Nome:', existingUser.name);
      console.log('   - Role:', existingUser.role);
      return;
    }
    
    // 2. Criar o tenant do sistema
    console.log('');
    console.log('1️⃣ Criando tenant do sistema...');
    const tenantResult = await db.collection('tenants').insertOne({
      name: 'Sistema Servus',
      description: 'Tenant do sistema para administradores globais',
      isActive: true,
      email: 'admin@servus.com',
      telefone: '(11) 99999-9999',
      address: {
        cep: '00000-000',
        rua: 'Sistema',
        numero: '0',
        bairro: 'Sistema',
        cidade: 'Sistema',
        estado: 'SP'
      },
      plan: 'enterprise',
      maxBranches: -1, // Ilimitado
      features: {
        functionsByMinistry: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    if (tenantResult.insertedId) {
      console.log('✅ Tenant criado com sucesso!');
      console.log('   - ID:', tenantResult.insertedId);
      console.log('   - Nome: Sistema Servus');
    } else {
      console.log('❌ Erro ao criar tenant');
      process.exit(1);
    }
    
    const tenantId = tenantResult.insertedId;
    
    // 3. Criar o usuário servus_admin
    console.log('');
    console.log('2️⃣ Criando usuário servus_admin...');
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash('servus123', 10);
    
    const userResult = await db.collection('users').insertOne({
      name: 'Servus Admin',
      email: 'servus_admin@servus.com',
      password: hashedPassword,
      role: 'servus_admin',
      tenantId: tenantId,
      branchId: null, // Admin global não tem branch específica
      isActive: true,
      profileCompleted: true,
      refreshTokens: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    if (userResult.insertedId) {
      console.log('✅ Usuário servus_admin criado!');
      console.log('   - ID:', userResult.insertedId);
      console.log('   - Email: servus_admin@servus.com');
      console.log('   - Senha: servus123');
      console.log('   - Role: servus_admin');
    } else {
      console.log('❌ Erro ao criar usuário');
      process.exit(1);
    }
    
    const userId = userResult.insertedId;
    
    // 4. Criar o membership do servus_admin
    console.log('');
    console.log('3️⃣ Criando membership do servus_admin...');
    const membershipResult = await db.collection('memberships').insertOne({
      user: userId,
      tenant: tenantId,
      branch: null, // null = vínculo na matriz
      ministry: null, // null para servus_admin
      role: 'tenant_admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    if (membershipResult.insertedId) {
      console.log('✅ Membership servus_admin criado!');
      console.log('   - ID:', membershipResult.insertedId);
      console.log('   - Usuário:', userId);
      console.log('   - Tenant:', tenantId);
      console.log('   - Role: tenant_admin');
    } else {
      console.log('❌ Erro ao criar membership');
      process.exit(1);
    }
    
    // 5. Verificar se tudo foi criado corretamente
    console.log('');
    console.log('🔍 Verificando criação...');
    const tenant = await db.collection('tenants').findOne({ _id: tenantId });
    const user = await db.collection('users').findOne({ _id: userId });
    const membership = await db.collection('memberships').findOne({ _id: membershipResult.insertedId });
    
    if (tenant && user && membership) {
      console.log('');
      console.log('🎉 SETUP COMPLETO NO ATLAS!');
      console.log('==================');
      console.log('📋 RESUMO:');
      console.log('==================');
      console.log('🏢 TENANT:');
      console.log('   - Nome:', tenant.name);
      console.log('   - ID:', tenant._id);
      console.log('   - Email:', tenant.email);
      console.log('   - Ativo:', tenant.isActive);
      console.log('');
      console.log('👤 USUÁRIO:');
      console.log('   - Nome:', user.name);
      console.log('   - Email:', user.email);
      console.log('   - ID:', user._id);
      console.log('   - Role global:', user.role);
      console.log('   - Tenant ID:', user.tenantId);
      console.log('   - Ativo:', user.isActive);
      console.log('');
      console.log('🔗 MEMBERSHIP:');
      console.log('   - ID:', membership._id);
      console.log('   - Usuário:', membership.user);
      console.log('   - Tenant:', membership.tenant);
      console.log('   - Role:', membership.role);
      console.log('   - Ativo:', membership.isActive);
      console.log('');
      console.log('🔑 CREDENCIAIS DE ACESSO:');
      console.log('   Email: servus_admin@servus.com');
      console.log('   Senha: servus123');
      console.log('   Tenant ID para usar no header x-tenant-id:', tenant._id);
      console.log('');
      console.log('✅ Servus Admin criado com sucesso no Atlas!');
      console.log('🚀 Pronto para usar!');
    } else {
      console.log('❌ Erro na verificação');
      console.log('Tenant existe:', !!tenant);
      console.log('Usuário existe:', !!user);
      console.log('Membership existe:', !!membership);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createServusAdminAtlas();
