import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { TenantModule } from '../tenants/tenants.module';
import { BranchModule } from '../branches/branches.modules';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TenantModule,
    BranchModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'aServus1108',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}