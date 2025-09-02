// src/scripts/test-permissions.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Role, MembershipRole } from '../common/enums/role.enum';
import { getCombinedPermissions } from '../common/utils/permissions.util';

async function testPermissions() {
  console.log('🔍 Testando geração de permissões...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get<Connection>(getConnectionToken());
  
  try {
    // 1. Testar função getCombinedPermissions
    console.log('\n🧪 Testando função getCombinedPermissions:');
    
    const servusAdminPerms = getCombinedPermissions(Role.ServusAdmin);
    console.log('ServusAdmin permissions:', servusAdminPerms);
    
    const volunteerPerms = getCombinedPermissions(Role.Volunteer);
    console.log('Volunteer permissions:', volunteerPerms);
    
    const tenantAdminPerms = getCombinedPermissions(Role.Volunteer, MembershipRole.TenantAdmin);
    console.log('Volunteer + TenantAdmin permissions:', tenantAdminPerms);
    
    // 2. Verificar usuários no banco
    console.log('\n👥 Verificando usuários no banco:');
    const usersCollection = connection.db!.collection('users');
    const users = await usersCollection.find({}).toArray();
    
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}): role=${user.role}`);
    });
    
    // 3. Verificar memberships
    console.log('\n📋 Verificando memberships:');
    const membershipsCollection = connection.db!.collection('memberships');
    const memberships = await membershipsCollection.find({}).toArray();
    
    memberships.forEach(membership => {
      console.log(`- User: ${membership.user}, Tenant: ${membership.tenant}, Role: ${membership.role}, Active: ${membership.isActive}`);
    });
    
    // 4. Verificar tenants
    console.log('\n🏢 Verificando tenants:');
    const tenantsCollection = connection.db!.collection('tenants');
    const tenants = await tenantsCollection.find({}).toArray();
    
    tenants.forEach(tenant => {
      console.log(`- ${tenant.name} (${tenant.tenantId}): active=${tenant.isActive}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await app.close();
  }
}

testPermissions();
