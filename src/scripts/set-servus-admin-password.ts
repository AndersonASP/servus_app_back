// src/scripts/set-servus-admin-password.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as bcrypt from 'bcryptjs';

async function setServusAdminPassword() {
  console.log('🔐 Definindo senha do ServusAdmin...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get<Connection>(getConnectionToken());
  
  try {
    // 1. Buscar ServusAdmin
    console.log('\n👑 Buscando ServusAdmin...');
    const usersCollection = connection.db!.collection('users');
    const servusAdmin = await usersCollection.findOne({ role: 'servus_admin' });
    
    if (!servusAdmin) {
      console.log('❌ ServusAdmin não encontrado');
      return;
    }
    
    console.log(`✅ ServusAdmin encontrado: ${servusAdmin.name} (${servusAdmin.email})`);
    
    // 2. Gerar hash da senha
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log(`\n🔐 Senha definida: ${password}`);
    console.log(`🔐 Hash gerado: ${hashedPassword.substring(0, 20)}...`);
    
    // 3. Atualizar senha no banco
    await usersCollection.updateOne(
      { _id: servusAdmin._id },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('✅ Senha atualizada no banco');
    
    // 4. Verificar resultado
    const updatedUser = await usersCollection.findOne({ _id: servusAdmin._id });
    if (updatedUser) {
      console.log('\n🔍 Usuário atualizado:');
      console.log('- Nome:', updatedUser.name);
      console.log('- Email:', updatedUser.email);
      console.log('- Role:', updatedUser.role);
      console.log('- Senha definida:', !!updatedUser.password);
    } else {
      console.log('❌ Erro: Usuário não encontrado após atualização');
    }
    
    console.log('\n🎉 Senha do ServusAdmin definida com sucesso!');
    console.log('📱 Use as credenciais:');
    console.log('   Email: servus@admin.com');
    console.log('   Senha: admin123');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await app.close();
  }
}

setServusAdminPassword();
