import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';

import { DatabaseConfig } from './config/database.config';
import { environmentConfig, validateEnvironment } from './config/environment.config';
import { TenantMiddleware } from './common/middlewares/tenant.middleware';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PolicyGuard } from './common/guards/policy.guard';

import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantModule } from './modules/tenants/tenants.module';
import { BranchModule } from './modules/branches/branches.module';
import { MinistriesModule } from './modules/ministries/ministries.module';
import { MembershipsModule } from './modules/membership/memberships.module';
import { VolunteersModule } from './modules/volunteers/volunteers.module';
import { FunctionsModule } from './modules/functions/functions.module';
import { FormsModule } from './modules/forms/forms.module';
import { EventsModule } from './modules/events/events.module';
import { ScalesModule } from './modules/scales/scales.module';
import { TemplatesModule } from './modules/templates/templates.module';



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

    // Rate Limiting para proteção contra ataques
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('environment.nodeEnv');
        
        // Configurações diferentes por ambiente
        if (nodeEnv === 'prod') {
          return [
            {
              ttl: 60000, // 1 minuto
              limit: 100, // 100 requests por minuto por IP (produção)
            },
            {
              ttl: 300000, // 5 minutos
              limit: 20, // 20 requests por 5 minutos para endpoints de auth
            },
          ];
        } else {
          // Desenvolvimento - limites mais permissivos
          return [
            {
              ttl: 60000, // 1 minuto
              limit: 1000, // 1000 requests por minuto por IP
            },
            {
              ttl: 300000, // 5 minutos
              limit: 200, // 200 requests por 5 minutos para endpoints de auth
            },
          ];
        }
      },
      inject: [ConfigService],
    }),

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
    FormsModule,
    EventsModule,
    ScalesModule,
    TemplatesModule,


  ],
  providers: [
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
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

        // 🔓 Criação de tenants (não precisam de tenant válido)
        { path: 'tenants', method: RequestMethod.POST },
        { path: 'tenants/with-admin', method: RequestMethod.POST },

        // 🔓 Formulários públicos (não precisam de tenant válido)
        { path: 'forms/public/*path', method: RequestMethod.ALL },
        { path: 'forms/*/submit', method: RequestMethod.POST },
        { path: 'forms/ministries', method: RequestMethod.GET },
        { path: 'forms/test', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
