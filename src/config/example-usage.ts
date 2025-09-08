// ===========================================
// EXEMPLO DE USO DAS CONFIGURAÇÕES DE AMBIENTE
// ===========================================

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentConfig } from './environment.config';

@Injectable()
export class ExampleService {
  constructor(private configService: ConfigService) {}

  // Exemplo 1: Acessando configurações individuais
  getDatabaseConfig() {
    return {
      uri: this.configService.get<string>('environment.mongoUri'),
      // Outras configurações do banco se necessário
    };
  }

  // Exemplo 2: Acessando configurações JWT
  getJwtConfig() {
    return {
      accessSecret: this.configService.get<string>('environment.jwt.accessSecret'),
      refreshSecret: this.configService.get<string>('environment.jwt.refreshSecret'),
      accessExpiresIn: this.configService.get<number>('environment.jwt.accessExpiresIn'),
      refreshExpiresIn: this.configService.get<number>('environment.jwt.refreshExpiresIn'),
    };
  }

  // Exemplo 3: Acessando configurações Redis
  getRedisConfig() {
    return {
      host: this.configService.get<string>('environment.redis.host'),
      port: this.configService.get<number>('environment.redis.port'),
      password: this.configService.get<string>('environment.redis.password'),
      db: this.configService.get<number>('environment.redis.db'),
    };
  }

  // Exemplo 4: Acessando configurações de email
  getMailConfig() {
    return {
      host: this.configService.get<string>('environment.mail.host'),
      port: this.configService.get<number>('environment.mail.port'),
      user: this.configService.get<string>('environment.mail.user'),
      pass: this.configService.get<string>('environment.mail.pass'),
      from: this.configService.get<string>('environment.mail.from'),
    };
  }

  // Exemplo 5: Acessando configurações do Google OAuth
  getGoogleConfig() {
    return {
      clientId: this.configService.get<string>('environment.google.clientId'),
      clientSecret: this.configService.get<string>('environment.google.clientSecret'),
    };
  }

  // Exemplo 6: Verificando o ambiente atual
  getCurrentEnvironment() {
    return {
      nodeEnv: this.configService.get<string>('environment.nodeEnv'),
      port: this.configService.get<number>('environment.port'),
      apiPrefix: this.configService.get<string>('environment.apiPrefix'),
      logLevel: this.configService.get<string>('environment.logLevel'),
    };
  }

  // Exemplo 7: Acessando configurações de CORS
  getCorsConfig() {
    return {
      origin: this.configService.get<string[]>('environment.cors.origin'),
    };
  }

  // Exemplo 8: Verificando se está em produção
  isProduction() {
    return this.configService.get<string>('environment.nodeEnv') === 'production';
  }

  // Exemplo 9: Verificando se está em desenvolvimento
  isDevelopment() {
    return this.configService.get<string>('environment.nodeEnv') === 'development';
  }

  // Exemplo 10: Acessando toda a configuração de uma vez
  getAllConfig(): EnvironmentConfig {
    return this.configService.get<EnvironmentConfig>('environment');
  }
}

// ===========================================
// EXEMPLO DE USO EM MÓDULOS
// ===========================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { environmentConfig } from './environment.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [environmentConfig],
    }),
  ],
  providers: [ExampleService],
})
export class ExampleModule {}

// ===========================================
// EXEMPLO DE USO EM FACTORIES
// ===========================================

import { ConfigService } from '@nestjs/config';

export const createDatabaseConnection = (configService: ConfigService) => {
  const mongoUri = configService.get<string>('environment.mongoUri');
  const nodeEnv = configService.get<string>('environment.nodeEnv');
  
  return {
    uri: mongoUri,
    options: {
      // Opções específicas por ambiente
      ...(nodeEnv === 'production' && {
        ssl: true,
        sslValidate: true,
      }),
    },
  };
};

// ===========================================
// EXEMPLO DE USO EM GUARDS
// ===========================================

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnv = this.configService.get<string>('environment.nodeEnv');
    
    // Exemplo: só permitir em desenvolvimento
    if (nodeEnv !== 'development') {
      return false;
    }
    
    return true;
  }
}

// ===========================================
// EXEMPLO DE USO EM INTERCEPTORS
// ===========================================

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logLevel = this.configService.get<string>('environment.logLevel');
    
    // Só logar se o nível permitir
    if (logLevel === 'debug' || logLevel === 'info') {
      console.log('Request:', context.getArgs()[0].url);
    }
    
    return next.handle().pipe(
      tap(() => {
        if (logLevel === 'debug') {
          console.log('Response completed');
        }
      }),
    );
  }
}
