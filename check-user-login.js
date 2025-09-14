const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function checkUserLogin() {
  const uri = 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🚀 Conectado ao MongoDB Atlas');
    
    const db = client.db('servus');
    
    // Buscar usuário servus_admin
    const user = await db.collection('users').findOne({ email: 'servus_admin@servus.com' });
    
    if (!user) {
      console.log('❌ Usuário servus_admin@servus.com não encontrado');
      return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log('   - ID:', user._id);
    console.log('   - Email:', user.email);
    console.log('   - Nome:', user.name);
    console.log('   - Senha hash:', user.password);
    console.log('   - TenantId:', user.tenantId);
    console.log('   - BranchId:', user.branchId);
    
    // Testar senha
    const password = 'servus123';
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔐 Senha "servus123" é válida:', isPasswordValid);
    
    // Verificar membership
    const membership = await db.collection('memberships').findOne({ userId: user._id });
    if (membership) {
      console.log('✅ Membership encontrado:');
      console.log('   - ID:', membership._id);
      console.log('   - UserId:', membership.userId);
      console.log('   - TenantId:', membership.tenantId);
      console.log('   - BranchId:', membership.branchId);
      console.log('   - Role:', membership.role);
    } else {
      console.log('❌ Membership não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

checkUserLogin();
