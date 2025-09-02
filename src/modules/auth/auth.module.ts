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
import { MongooseModule } from '@nestjs/mongoose';
import { Membership, MembershipSchema } from '../membership/schemas/membership.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TenantModule,
    BranchModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-in-production',
      signOptions: { expiresIn: '1h' }, // Aumentado para 1 hora para facilitar testes
    }),
    MongooseModule.forFeature([
      { name: Membership.name, schema: MembershipSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}