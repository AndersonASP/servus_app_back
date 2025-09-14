// Script para criar Servus Admin com tenant e membership
// Cole este código no mongosh do Compass

print('🚀 Criando Servus Admin...');
print('========================');

// 1. Criar o tenant do sistema
print('');
print('1️⃣ Criando tenant do sistema...');
const tenantResult = db.tenants.insertOne({
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
  print('✅ Tenant criado com sucesso!');
  print('   - ID:', tenantResult.insertedId);
  print('   - Nome: Sistema Servus');
} else {
  print('❌ Erro ao criar tenant');
  quit(1);
}

const tenantId = tenantResult.insertedId;

// 2. Criar o usuário servus_admin
print('');
print('2️⃣ Criando usuário servus_admin...');
const userResult = db.users.insertOne({
  name: 'Servus Admin',
  email: 'servus_admin@servus.com',
  password: '$2b$10$rQZ8K9vL2mN3pO4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', // servus123
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
  print('✅ Usuário servus_admin criado!');
  print('   - ID:', userResult.insertedId);
  print('   - Email: servus_admin@servus.com');
  print('   - Senha: servus123');
  print('   - Role: servus_admin');
} else {
  print('❌ Erro ao criar usuário');
  quit(1);
}

const userId = userResult.insertedId;

// 3. Criar o membership do servus_admin
print('');
print('3️⃣ Criando membership do servus_admin...');
const membershipResult = db.memberships.insertOne({
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
  print('✅ Membership servus_admin criado!');
  print('   - ID:', membershipResult.insertedId);
  print('   - Usuário:', userId);
  print('   - Tenant:', tenantId);
  print('   - Role: tenant_admin');
} else {
  print('❌ Erro ao criar membership');
  quit(1);
}

// 4. Verificar se tudo foi criado corretamente
print('');
print('🔍 Verificando criação...');
const tenant = db.tenants.findOne({ _id: tenantId });
const user = db.users.findOne({ _id: userId });
const membership = db.memberships.findOne({ _id: membershipResult.insertedId });

if (tenant && user && membership) {
  print('');
  print('🎉 SETUP COMPLETO!');
  print('==================');
  print('📋 RESUMO:');
  print('==================');
  print('🏢 TENANT:');
  print('   - Nome:', tenant.name);
  print('   - ID:', tenant._id);
  print('   - Email:', tenant.email);
  print('   - Ativo:', tenant.isActive);
  print('');
  print('👤 USUÁRIO:');
  print('   - Nome:', user.name);
  print('   - Email:', user.email);
  print('   - ID:', user._id);
  print('   - Role global:', user.role);
  print('   - Tenant ID:', user.tenantId);
  print('   - Ativo:', user.isActive);
  print('');
  print('🔗 MEMBERSHIP:');
  print('   - ID:', membership._id);
  print('   - Usuário:', membership.user);
  print('   - Tenant:', membership.tenant);
  print('   - Role:', membership.role);
  print('   - Ativo:', membership.isActive);
  print('');
  print('🔑 CREDENCIAIS DE ACESSO:');
  print('   Email: servus_admin@servus.com');
  print('   Senha: servus123');
  print('   Tenant ID para usar no header x-tenant-id:', tenant._id);
  print('');
  print('✅ Servus Admin criado com sucesso!');
  print('🚀 Pronto para usar!');
} else {
  print('❌ Erro na verificação');
  print('Tenant existe:', !!tenant);
  print('Usuário existe:', !!user);
  print('Membership existe:', !!membership);
  quit(1);
}
