import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { TenantModule } from '../tenants/tenants.module';
import { BranchModule } from '../branches/branches.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Membership,
  MembershipSchema,
} from '../membership/schemas/membership.schema';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TenantModule,
    BranchModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('environment.jwt.accessSecret'),
        signOptions: {
          expiresIn:
            configService.get<number>('environment.jwt.accessExpiresIn') ||
            3600,
        },
      }),
      inject: [ConfigService],
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
