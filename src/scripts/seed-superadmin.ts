import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../modules/users/schema/user.schema';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const userModel = app.get<Model<User>>('User');
    
    console.log('🔐 Criando Super Admin...');
    
    // Verificar se já existe
    const existingAdmin = await userModel.findOne({ email: 'servus@admin.com' });
    if (existingAdmin) {
      console.log('✅ Super Admin já existe:', existingAdmin.email);
      return;
    }
    
    // Criar super admin
    const hashedPassword = await bcrypt.hash('123456', 10);
    const superAdmin = await userModel.create({
      name: 'Servus Super Admin',
      email: 'servus@admin.com',
      password: hashedPassword,
      role: Role.ServusAdmin,
      isActive: true,
    });
    
    console.log('✅ Super Admin criado com sucesso!');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Senha: 123456');
    console.log('👑 Role:', superAdmin.role);
    console.log('🆔 ID:', superAdmin._id);
    
  } catch (error) {
    console.error('❌ Erro ao criar Super Admin:', error.message);
  } finally {
    await app.close();
  }
}

bootstrap();