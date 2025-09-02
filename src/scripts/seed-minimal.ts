import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../modules/users/schema/user.schema';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
  try {
    console.log('Starting seed...');
    
    const app = await NestFactory.createApplicationContext(AppModule);
    console.log('App created');
    
    const userModel = app.get<Model<User>>('User');
    console.log('User model obtained');
    
    // Create super admin
    const hashedPassword = await bcrypt.hash('123456', 10);
    console.log('Password hashed');
    
    const superAdmin = await userModel.create({
      name: 'Servus Super Admin',
      email: 'servus@admin.com',
      password: hashedPassword,
      role: Role.ServusAdmin,
      isActive: true,
    });
    
    console.log('Super Admin created:', superAdmin.email);
    await app.close();
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

bootstrap(); 