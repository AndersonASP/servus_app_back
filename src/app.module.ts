import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TenantMiddleware } from './common/middlewares/tenant.middleware';
import { DatabaseConfig } from './config/database.config';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './modules/tenants/schemas/tenant.schema';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantModule } from './modules/tenants/tenants.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { BranchModule } from './modules/branches/branches.modules';

@Module({
  imports: [
    MongooseModule.forFeature([{name: Tenant.name, schema: TenantSchema}]),
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseConfig,
    HealthModule,
    AuthModule,
    UsersModule,
    TenantModule,
    BranchModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,   // ✅ Primeiro valida JWT
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/google', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
      ).forRoutes('*'); // aplica para todas as rotas
  }
}