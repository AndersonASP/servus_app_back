import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/services/auth.service';
import { UsersService } from '../modules/users/services/users.service';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

async function debugLoginIssue() {
  console.log('🔍 Diagnosticando problema de login...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  const usersService = app.get(UsersService);
  const connection = app.get<Connection>(getConnectionToken());

  try {
    // 1. Verificar se o usuário existe
    console.log('1️⃣ Verificando usuário no banco...');
    const user = await usersService.findByEmail('servus@admin.com');
    if (!user) {
      console.log('❌ Usuário não encontrado no banco');
      return;
    }
    console.log('✅ Usuário encontrado:', {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      password: user.password ? '***' : 'N/A'
    });

    // 2. Verificar se o usuário tem membership
    console.log('\n2️⃣ Verificando membership do usuário...');
    const memberships = await connection.db!.collection('memberships').find({
      userId: user._id
    }).toArray();
    
    console.log(`📋 Encontrados ${memberships.length} memberships:`);
    memberships.forEach((m, i) => {
      console.log(`   ${i + 1}. ID: ${m._id}`);
      console.log(`      Role: ${m.role}`);
      console.log(`      Tenant: ${m.tenantId || 'N/A'}`);
      console.log(`      Branch: ${m.branchId || 'N/A'}`);
      console.log(`      IsActive: ${m.isActive}`);
    });

    // 3. Verificar se o tenant existe
    if (memberships.length > 0 && memberships[0].tenantId) {
      console.log('\n3️⃣ Verificando tenant...');
      const tenant = await connection.db!.collection('tenants').findOne({
        _id: memberships[0].tenantId
      });
      
      if (tenant) {
        console.log('✅ Tenant encontrado:', {
          id: tenant._id,
          tenantId: tenant.tenantId,
          name: tenant.name,
          isActive: tenant.isActive
        });
      } else {
        console.log('❌ Tenant não encontrado');
      }
    }

    // 4. Verificar se usuário tem senha
    console.log('\n4️⃣ Verificando senha do usuário...');
    console.log('   - Tem senha:', !!user.password);
    console.log('   - Hash da senha:', user.password ? user.password.substring(0, 20) + '...' : 'N/A');

    // 5. Testar login direto
    console.log('\n5️⃣ Testando login direto...');
    try {
      const loginResult = await authService.login({
        email: 'servus@admin.com',
        password: 'admin123'
      }, 'test-device-id');
      
      console.log('✅ Login realizado com sucesso!');
      console.log('   - User:', loginResult.user.name);
      console.log('   - Role:', loginResult.user.role);
      console.log('   - Tenant:', loginResult.tenant?.name || 'N/A');
      console.log('   - Memberships:', loginResult.memberships?.length || 0);
      
    } catch (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      console.log('   - Tipo de erro:', loginError.constructor.name);
      if (loginError.response) {
        console.log('   - Status:', loginError.response.status);
        console.log('   - Dados:', loginError.response.data);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await app.close();
    await connection.close();
  }
}

debugLoginIssue().catch(console.error);
