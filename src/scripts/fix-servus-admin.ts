// src/scripts/fix-servus-admin.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Role, MembershipRole } from '../common/enums/role.enum';

async function fixServusAdmin() {
  console.log('🔧 Corrigindo ServusAdmin...');
  
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
    
    // 2. Criar tenant para o ServusAdmin
    console.log('\n🏢 Criando tenant para ServusAdmin...');
    const tenantsCollection = connection.db!.collection('tenants');
    
    const servusTenant = {
      tenantId: 'servus-system',
      name: 'Servus System',
      description: 'Sistema principal do Servus',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const tenantResult = await tenantsCollection.insertOne(servusTenant);
    console.log(`✅ Tenant criado: ${servusTenant.name} (${servusTenant.tenantId})`);
    
    // 3. Corrigir membership do ServusAdmin
    console.log('\n📋 Corrigindo membership do ServusAdmin...');
    const membershipsCollection = connection.db!.collection('memberships');
    
    // Remover membership incorreto
    await membershipsCollection.deleteMany({ user: servusAdmin._id });
    console.log('🗑️ Membership incorreto removido');
    
    // Criar membership correto
    const correctMembership = {
      user: servusAdmin._id,
      tenant: tenantResult.insertedId,
      branch: null,
      ministry: null,
      role: 'tenant_admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await membershipsCollection.insertOne(correctMembership);
    console.log('✅ Membership correto criado');
    
    // 4. Verificar resultado
    console.log('\n🔍 Verificando resultado...');
    const finalMembership = await membershipsCollection.findOne({ user: servusAdmin._id });
    console.log('Membership final:', finalMembership);
    
    console.log('\n🎉 ServusAdmin corrigido com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await app.close();
  }
}

fixServusAdmin();
