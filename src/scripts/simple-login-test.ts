import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/services/auth.service';

async function simpleLoginTest() {
  console.log('🧪 Teste simples de login...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  try {
    console.log('🔐 Tentando fazer login...');
    
    const loginResult = await authService.login({
      email: 'servus@admin.com',
      password: 'admin123'
    }, 'test-device-id');
    
    console.log('✅ Login realizado com sucesso!');
    console.log('   - User:', loginResult.user.name);
    console.log('   - Role:', loginResult.user.role);
    console.log('   - Tenant:', loginResult.tenant?.name || 'N/A');
    console.log('   - Memberships:', loginResult.memberships?.length || 0);
    
  } catch (error) {
    console.log('❌ Erro no login:', error.message);
    console.log('   - Tipo de erro:', error.constructor.name);
    if (error.response) {
      console.log('   - Status:', error.response.status);
      console.log('   - Dados:', error.response.data);
    }
  } finally {
    await app.close();
  }
}

simpleLoginTest().catch(console.error);
