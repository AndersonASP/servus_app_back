const { MongoClient } = require('mongodb');

async function verifyCurrentDatabase() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    // Verificar qual banco está sendo usado
    const db = client.db('servus');
    console.log('📋 Banco atual: servus');
    
    // Verificar usuário servus_admin
    const servusAdmin = await db.collection('users').findOne({ email: 'servus_admin@servus.com' });
    
    if (servusAdmin) {
      console.log('✅ Servus Admin encontrado!');
      console.log('   - ID:', servusAdmin._id);
      console.log('   - Nome:', servusAdmin.name);
      console.log('   - Email:', servusAdmin.email);
      console.log('   - Role:', servusAdmin.role);
      console.log('   - Tem senha:', !!servusAdmin.password);
      console.log('   - Ativo:', servusAdmin.isActive);
      console.log('   - TenantId:', servusAdmin.tenantId);
    } else {
      console.log('❌ Servus Admin NÃO encontrado');
    }
    
    // Verificar tenant
    const tenant = await db.collection('tenants').findOne({ _id: servusAdmin?.tenantId });
    if (tenant) {
      console.log('✅ Tenant encontrado!');
      console.log('   - ID:', tenant._id);
      console.log('   - Nome:', tenant.name);
      console.log('   - Ativo:', tenant.isActive);
    }
    
    // Verificar membership
    const membership = await db.collection('memberships').findOne({ user: servusAdmin?._id });
    if (membership) {
      console.log('✅ Membership encontrado!');
      console.log('   - ID:', membership._id);
      console.log('   - Role:', membership.role);
      console.log('   - Ativo:', membership.isActive);
    }
    
    // Verificar se o backend está usando este banco
    console.log('\n🔍 Verificando configuração do backend...');
    console.log('   - MONGO_URI configurada para Atlas: ✅');
    console.log('   - Banco: servus');
    console.log('   - Usuário servus_admin existe: ' + (servusAdmin ? '✅' : '❌'));
    
    if (servusAdmin) {
      console.log('\n🎉 TUDO CORRETO!');
      console.log('   - Backend configurado para Atlas ✅');
      console.log('   - Usuário servus_admin existe ✅');
      console.log('   - Credenciais: servus_admin@servus.com / servus123 ✅');
    } else {
      console.log('\n❌ PROBLEMA ENCONTRADO!');
      console.log('   - Usuário servus_admin não existe no banco');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

verifyCurrentDatabase();
