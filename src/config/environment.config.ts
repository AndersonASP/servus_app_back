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

export const environmentConfig = registerAs('environment', (): EnvironmentConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/servus_dev',
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
      accessExpiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '3600', 10),
      refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800', 10),
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
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    },
    logLevel: process.env.LOG_LEVEL || 'debug',
  };
});

// Validação de variáveis obrigatórias por ambiente
export const validateEnvironment = (config: EnvironmentConfig): void => {
  const requiredVars = {
    development: ['MONGO_URI'],
    staging: ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'REDIS_HOST'],
    production: ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'REDIS_HOST', 'REDIS_PASSWORD', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'MAIL_USER', 'MAIL_PASS'],
  };

  const missingVars = requiredVars[config.nodeEnv as keyof typeof requiredVars] || [];
  
  for (const varName of missingVars) {
    if (!process.env[varName]) {
      throw new Error(`Variável de ambiente obrigatória não encontrada: ${varName}`);
    }
  }

  // Validações específicas por ambiente
  if (config.nodeEnv === 'production') {
    if (config.jwt.accessSecret === 'default-access-secret' || config.jwt.refreshSecret === 'default-refresh-secret') {
      throw new Error('Secrets JWT devem ser alterados em produção');
    }
    
    if (config.mongoUri.includes('localhost')) {
      throw new Error('MongoDB URI não pode ser localhost em produção');
    }
  }
};
