// src/scripts/debug-memberships.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

async function debugMemberships() {
  console.log('🔍 Debugando memberships no banco...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get<Connection>(getConnectionToken());
  
  try {
    // 1. Verificar usuários
    console.log('\n👥 USUÁRIOS:');
    const usersCollection = connection.db!.collection('users');
    const users = await usersCollection.find({}).toArray();
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role} - ID: ${user._id}`);
    });

    // 2. Verificar tenants
    console.log('\n🏢 TENANTS:');
    const tenantsCollection = connection.db!.collection('tenants');
    const tenants = await tenantsCollection.find({}).toArray();
    tenants.forEach(tenant => {
      console.log(`  - ${tenant.name} (${tenant.tenantId}) - ID: ${tenant._id}`);
    });

    // 3. Verificar memberships
    console.log('\n🔗 MEMBERSHIPS:');
    const membershipsCollection = connection.db!.collection('memberships');
    const memberships = await membershipsCollection.find({}).toArray();
    memberships.forEach(membership => {
      console.log(`  - User: ${membership.user} - Tenant: ${membership.tenant} - Role: ${membership.role} - ID: ${membership._id}`);
    });

    // 4. Verificar membership específico do pastor
    console.log('\n🔍 MEMBERSHIP DO PASTOR:');
    const pastorMembership = await membershipsCollection.findOne({
      user: '68ad04c95a3ab5a5ac37436a'
    });
    
    if (pastorMembership) {
      console.log('✅ Membership encontrado:', pastorMembership);
    } else {
      console.log('❌ Membership NÃO encontrado para o pastor');
      
      // Verificar se o ID está correto
      const pastorUser = await usersCollection.findOne({ email: 'pastor@igreja.com' });
      if (pastorUser) {
        console.log('🔍 Pastor encontrado com ID:', pastorUser._id);
        
        // Buscar membership com o ID correto
        const membershipWithCorrectId = await membershipsCollection.findOne({
          user: pastorUser._id
        });
        
        if (membershipWithCorrectId) {
          console.log('✅ Membership encontrado com ID correto:', membershipWithCorrectId);
        } else {
          console.log('❌ Membership NÃO encontrado mesmo com ID correto');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao debugar:', error);
  } finally {
    await connection.close();
    await app.close();
    process.exit(0);
  }
}

debugMemberships();
