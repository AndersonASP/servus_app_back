#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script para configurar arquivos de ambiente
 * Uso: node scripts/setup-env.js [dev|hom|prod]
 */

const environments = {
  dev: {
    NODE_ENV: 'dev',
    PORT: '3000',
    API_PREFIX: 'api',
    MONGO_URI: 'mongodb://localhost:27017/servus_dev',
    JWT_ACCESS_SECRET: 'dev-access-secret-key-change-in-production',
    JWT_REFRESH_SECRET: 'dev-refresh-secret-key-change-in-production',
    JWT_ACCESS_EXPIRES_IN: '3600',
    JWT_REFRESH_EXPIRES_IN: '604800',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: '',
    REDIS_DB: '0',
    GOOGLE_CLIENT_ID: 'your-google-client-id-dev',
    GOOGLE_CLIENT_SECRET: 'your-google-client-secret-dev',
    MAIL_HOST: 'smtp.gmail.com',
    MAIL_PORT: '587',
    MAIL_USER: 'your-email-dev@gmail.com',
    MAIL_PASS: 'your-app-password-dev',
    MAIL_FROM: 'noreply-dev@servusapp.com',
    CORS_ORIGIN: 'http://localhost:3000,http://localhost:3001',
    LOG_LEVEL: 'debug'
  },
  hml: {
    NODE_ENV: 'hml',
    PORT: '3000',
    API_PREFIX: 'api',
    MONGO_URI: 'mongodb+srv://username:password@cluster-hom.mongodb.net/servus_hom',
    JWT_ACCESS_SECRET: 'hom-access-secret-key-very-secure',
    JWT_REFRESH_SECRET: 'hom-refresh-secret-key-very-secure',
    JWT_ACCESS_EXPIRES_IN: '3600',
    JWT_REFRESH_EXPIRES_IN: '604800',
    REDIS_HOST: 'redis-hom.redis.com',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: 'hom-redis-password',
    REDIS_DB: '0',
    GOOGLE_CLIENT_ID: 'your-google-client-id-hom',
    GOOGLE_CLIENT_SECRET: 'your-google-client-secret-hom',
    MAIL_HOST: 'smtp.gmail.com',
    MAIL_PORT: '587',
    MAIL_USER: 'your-email-hom@gmail.com',
    MAIL_PASS: 'your-app-password-hom',
    MAIL_FROM: 'noreply-hom@servusapp.com',
    CORS_ORIGIN: 'https://servus-hom.vercel.app,https://hom.servusapp.com',
    LOG_LEVEL: 'info'
  },
  prod: {
    NODE_ENV: 'prod',
    PORT: '3000',
    API_PREFIX: 'api',
    MONGO_URI: 'mongodb+srv://username:password@cluster-prod.mongodb.net/servus_prod',
    JWT_ACCESS_SECRET: 'prod-access-secret-key-ultra-secure-random-string',
    JWT_REFRESH_SECRET: 'prod-refresh-secret-key-ultra-secure-random-string',
    JWT_ACCESS_EXPIRES_IN: '3600',
    JWT_REFRESH_EXPIRES_IN: '604800',
    REDIS_HOST: 'redis-prod.redis.com',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: 'prod-redis-password-very-secure',
    REDIS_DB: '0',
    GOOGLE_CLIENT_ID: 'your-google-client-id-prod',
    GOOGLE_CLIENT_SECRET: 'your-google-client-secret-prod',
    MAIL_HOST: 'smtp.gmail.com',
    MAIL_PORT: '587',
    MAIL_USER: 'your-email-prod@gmail.com',
    MAIL_PASS: 'your-app-password-prod',
    MAIL_FROM: 'noreply@servusapp.com',
    CORS_ORIGIN: 'https://servusapp.com,https://www.servusapp.com',
    LOG_LEVEL: 'warn'
  }
};

function createEnvFile(env, config) {
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const envFile = `.env.${env}`;
  const envDir = path.resolve(process.cwd(), 'env');
  const envPath = path.resolve(envDir, envFile);
  
  // Criar pasta env/ se não existir
  if (!fs.existsSync(envDir)) {
    fs.mkdirSync(envDir, { recursive: true });
    console.log(`📁 Pasta env/ criada: ${envDir}`);
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Arquivo ${envFile} criado com sucesso!`);
  console.log(`📁 Localização: ${envPath}`);
}

function showUsage() {
  console.log('🔧 Script de Configuração de Ambiente - Servus Backend');
  console.log('');
  console.log('Uso:');
  console.log('  node scripts/setup-env.js [ambiente]');
  console.log('');
  console.log('Ambientes disponíveis:');
  console.log('  dev   - Desenvolvimento');
  console.log('  hml   - Homologação');
  console.log('  prod  - Produção');
  console.log('  all   - Todos os ambientes');
  console.log('');
  console.log('Exemplos:');
  console.log('  node scripts/setup-env.js dev');
  console.log('  node scripts/setup-env.js all');
}

function main() {
  const args = process.argv.slice(2);
  const env = args[0];
  
  if (!env || !['dev', 'hml', 'prod', 'all'].includes(env)) {
    showUsage();
    process.exit(1);
  }
  
  console.log('🚀 Configurando arquivos de ambiente...');
  console.log('');
  
  if (env === 'all') {
    Object.entries(environments).forEach(([envKey, config]) => {
      createEnvFile(envKey, config);
    });
  } else {
    createEnvFile(env, environments[env]);
  }
  
  console.log('');
  console.log('📝 Próximos passos:');
  console.log('1. Edite os arquivos env/.env.* com suas configurações reais');
  console.log('2. Configure as variáveis sensíveis (secrets, senhas, etc.)');
  console.log('3. Teste com: npm run start:dev (ou hom/prod)');
  console.log('');
  console.log('⚠️  Lembre-se de adicionar a pasta env/ ao .gitignore!');
}

main();

