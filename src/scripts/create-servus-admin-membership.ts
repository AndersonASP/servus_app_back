// src/scripts/create-servus-admin-membership.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MembershipRole } from '../common/enums/role.enum';

async function createServusAdminMembership() {
  console.log('🔗 Criando membership para ServusAdmin...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get<Connection>(getConnectionToken());
  
  try {
    // 1. Buscar o ServusAdmin
    const usersCollection = connection.db!.collection('users');
    const adminUser = await usersCollection.findOne({ email: 'admin@servus.com' });
    
    if (!adminUser) {
      console.log('❌ ServusAdmin não encontrado. Execute primeiro: npm run db:seed');
      return;
    }
    
    console.log(`✅ ServusAdmin encontrado: ${adminUser.name} (${adminUser.email})`);

    // 2. Criar tenant básico para o membership
    console.log('🏢 Criando tenant básico...');
    const tenant = {
      tenantId: 'servus-system',
      name: 'Sistema Servus',
      description: 'Tenant do sistema para ServusAdmin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const tenantsCollection = connection.db!.collection('tenants');
    const tenantResult = await tenantsCollection.insertOne(tenant);
    console.log(`✅ Tenant criado com ID: ${tenantResult.insertedId}`);

    // 3. Criar Membership do ServusAdmin
    console.log('🔗 Criando membership do ServusAdmin...');
    const membership = {
      user: adminUser._id,
      tenant: tenantResult.insertedId,
      branch: null,
      ministry: null,
      role: MembershipRole.TenantAdmin,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const membershipsCollection = connection.db!.collection('memberships');
    const membershipResult = await membershipsCollection.insertOne(membership);
    console.log(`✅ Membership criado com ID: ${membershipResult.insertedId}`);

    console.log('\n🎉 Membership do ServusAdmin criado com sucesso!');
    console.log('\n📋 Resumo:');
    console.log(`  👑 ServusAdmin: ${adminUser.email}`);
    console.log(`  🏢 Tenant: servus-system (${tenant.name})`);
    console.log(`  🔗 Role no Tenant: TenantAdmin`);
    console.log(`  💡 Agora o ServusAdmin pode criar novos tenants!`);
    
  } catch (error) {
    console.error('❌ Erro ao criar membership:', error);
  } finally {
    await connection.close();
    await app.close();
    process.exit(0);
  }
}

createServusAdminMembership();
