// src/scripts/seed-initial.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcryptjs';

async function seedInitial() {
  console.log('🌱 Iniciando seed inicial...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get<Connection>(getConnectionToken());
  
  try {
    // 1. Criar ServusAdmin
    console.log('👑 Criando ServusAdmin...');
    
    const adminUser = {
      name: 'Servus Admin',
      email: 'admin@servus.com',
      password: await bcrypt.hash('admin123', 10),
      role: Role.ServusAdmin,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const usersCollection = connection.db!.collection('users');
    const adminResult = await usersCollection.insertOne(adminUser);
    console.log(`✅ ServusAdmin criado com ID: ${adminResult.insertedId}`);
    
    // ✅ ServusAdmin NÃO precisa de membership - tem acesso global a todos os tenants
    console.log('🌍 ServusAdmin criado com acesso global (sem membership)');
    
    console.log('\n🎉 Seed inicial concluído com sucesso!');
    console.log('\n📋 Resumo:');
    console.log(`  👑 ServusAdmin: admin@servus.com / admin123`);
    console.log(`  🔑 Senha: admin123`);
    console.log(`  🎯 Role Global: ServusAdmin (acesso total ao sistema)`);
    console.log(`  🌍 Acesso: Global a todos os tenants (sem membership)`);
    console.log('\n💡 Próximos passos:');
    console.log(`  1. Fazer login com admin@servus.com / admin123`);
    console.log(`  2. Criar novos tenants através do app`);
    console.log(`  3. Configurar branches e ministérios nos novos tenants`);
    
  } catch (error) {
    console.error('❌ Erro no seed inicial:', error);
  } finally {
    await connection.close();
    await app.close();
    process.exit(0);
  }
}

seedInitial();
