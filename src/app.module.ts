import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { DatabaseConfig } from './config/database.config';
import { environmentConfig, validateEnvironment } from './config/environment.config';
import { TenantMiddleware } from './common/middlewares/tenant.middleware';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PolicyGuard } from './common/guards/policy.guard';

import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantModule } from './modules/tenants/tenants.module';
import { BranchModule } from './modules/branches/branches.modules';
import { MinistriesModule } from './modules/ministries/ministries.module';
import { MembershipsModule } from './modules/membership/memberships.module';
import { VolunteersModule } from './modules/volunteers/volunteers.module';
import { FunctionsModule } from './modules/functions/functions.module';



// ⬇️ Models usados pelo PolicyGuard
import { Tenant, TenantSchema } from './modules/tenants/schemas/tenant.schema';
import { Branch, BranchSchema } from './modules/branches/schemas/branch.schema';
import {
  Membership,
  MembershipSchema,
} from './modules/membership/schemas/membership.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      load: [environmentConfig],
      validate: (config) => {
        // Validação adicional se necessário
        return config;
      }
    }),
    ...DatabaseConfig,

    // ⬇️ Registra os models que o PolicyGuard injeta via @InjectModel
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),

    // Seus módulos de features
    HealthModule,
    AuthModule,
    UsersModule,
    TenantModule,
    BranchModule,
    MinistriesModule,
    MembershipsModule,
    VolunteersModule,
    FunctionsModule,


  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PolicyGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        // 🔓 Auth público (login/refresh/google) — base e subrotas
        { path: 'auth', method: RequestMethod.ALL },
        { path: 'auth/*path', method: RequestMethod.ALL },

        // 🔓 Health
        { path: 'health', method: RequestMethod.GET },

        // 🔓 Swagger (com e sem globalPrefix)
        { path: 'api/docs', method: RequestMethod.ALL },
        { path: 'api/docs/*path', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
