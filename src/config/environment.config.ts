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
  const nodeEnv = process.env.NODE_ENV || 'dev';
  
  // Validação básica de variáveis obrigatórias
  const requiredVars = {
    dev: ['MONGO_URI'],
    hml: ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'],
    prod: ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'REDIS_HOST'],
  };
  
  const missingVars = requiredVars[nodeEnv as keyof typeof requiredVars] || [];
  for (const varName of missingVars) {
    if (!process.env[varName]) {
      throw new Error(`Variável de ambiente obrigatória não encontrada: ${varName}`);
    }
  }
  
  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
    mongoUri: process.env.MONGO_URI || 'mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/?retryWrites=true&w=majority&appName=ServusCluster0',
    jwt: {
      accessSecret: process.env.JWT_SECRET || 'aServus1108',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'aServus1108',
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

// Validações específicas por ambiente
export const validateEnvironment = (config: EnvironmentConfig): void => {
  if (config.nodeEnv === 'prod') {
    if (config.jwt.accessSecret === 'aServus1108' || config.jwt.refreshSecret === 'aServus1108') {
      throw new Error('Secrets JWT devem ser alterados em produção');
    }
    
    if (config.mongoUri.includes('localhost')) {
      throw new Error('MongoDB URI não pode ser localhost em produção');
    }
  }
};
