const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function fixUserPassword() {
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
    
    console.log('✅ Usuário encontrado:', user.email);
    
    // Gerar nova senha hash
    const newPassword = 'servus123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('🔐 Nova senha hash gerada:', hashedPassword);
    
    // Atualizar senha do usuário
    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Senha atualizada com sucesso');
      
      // Verificar se a senha está funcionando
      const updatedUser = await db.collection('users').findOne({ _id: user._id });
      const isPasswordValid = await bcrypt.compare(newPassword, updatedUser.password);
      console.log('🔐 Nova senha é válida:', isPasswordValid);
    } else {
      console.log('❌ Falha ao atualizar senha');
    }
    
    // Criar membership se não existir
    const membership = await db.collection('memberships').findOne({ userId: user._id });
    if (!membership) {
      console.log('🔗 Criando membership...');
      
      const newMembership = {
        userId: user._id,
        tenantId: user.tenantId,
        branchId: user.branchId,
        role: 'TenantAdmin',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const membershipResult = await db.collection('memberships').insertOne(newMembership);
      console.log('✅ Membership criado:', membershipResult.insertedId);
    } else {
      console.log('✅ Membership já existe');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

fixUserPassword();
