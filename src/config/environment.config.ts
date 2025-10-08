import { registerAs } from '@nestjs/config';

export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  mongoUri: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: number;
    refreshExpiresIn: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  google: {
    clientId: string;
    clientSecret: string;
  };
  mail: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  cors: {
    origin: string[];
  };
  logLevel: string;
}

export const environmentConfig = registerAs(
  'environment',
  (): EnvironmentConfig => {
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Validação básica de variáveis obrigatórias
    const requiredVars = ['MONGO_URI'];

    // Variáveis adicionais para produção
    if (nodeEnv === 'production') {
      requiredVars.push('JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET');
    }

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(
          `Variável de ambiente obrigatória não encontrada: ${varName}`,
        );
      }
    }

    return {
      nodeEnv,
      port: parseInt(process.env.PORT || '3000', 10),
      apiPrefix: process.env.API_PREFIX || 'api',
      mongoUri:
        process.env.MONGO_URI ||
        (() => {
          throw new Error(
            'MONGO_URI é obrigatória. Configure a variável de ambiente.',
          );
        })(),
      jwt: {
        accessSecret:
          process.env.JWT_ACCESS_SECRET ||
          (() => {
            throw new Error(
              'JWT_ACCESS_SECRET é obrigatória. Configure a variável de ambiente.',
            );
          })(),
        refreshSecret:
          process.env.JWT_REFRESH_SECRET ||
          (() => {
            throw new Error(
              'JWT_REFRESH_SECRET é obrigatória. Configure a variável de ambiente.',
            );
          })(),
        accessExpiresIn: parseInt(
          process.env.JWT_ACCESS_EXPIRES_IN || '3600',
          10,
        ),
        refreshExpiresIn: parseInt(
          process.env.JWT_REFRESH_EXPIRES_IN || '604800',
          10,
        ),
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      },
      mail: {
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '587', 10),
        user: process.env.MAIL_USER || '',
        pass: process.env.MAIL_PASS || '',
        from: process.env.MAIL_FROM || 'noreply@servusapp.com',
      },
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || [
          'http://localhost:3000',
        ],
      },
      logLevel: process.env.LOG_LEVEL || 'debug',
    };
  },
);

// Validações específicas por ambiente
export const validateEnvironment = (config: EnvironmentConfig): void => {
  if (config.nodeEnv === 'production') {
    // Validação de segurança: secrets JWT devem ser fornecidos via variáveis de ambiente
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error(
        'Secrets JWT são obrigatórios. Configure JWT_ACCESS_SECRET e JWT_REFRESH_SECRET.',
      );
    }

    if (config.mongoUri.includes('localhost')) {
      throw new Error('MongoDB URI não pode ser localhost em produção');
    }
  }
};
