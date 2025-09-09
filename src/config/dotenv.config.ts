import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Configuração do dotenv para carregar arquivos de ambiente específicos
 * baseado na variável NODE_ENV
 */
export const loadEnvironmentFile = (): void => {
  const nodeEnv = process.env.NODE_ENV || 'dev';
  
  // Mapear NODE_ENV para nomes de arquivo corretos
  const envFileMap = {
    'development': '.env.dev',
    'dev': '.env.dev',
    'staging': '.env.hml',
    'hml': '.env.hml',
    'production': '.env.prod',
    'prod': '.env.prod'
  };
  
  const envFile = envFileMap[nodeEnv as keyof typeof envFileMap] || `.env.${nodeEnv}`;
  const envPath = path.resolve(process.cwd(), 'env', envFile);
  
  // Tenta carregar o arquivo específico do ambiente
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.warn(`⚠️  Arquivo env/${envFile} não encontrado. Usando variáveis de ambiente do sistema.`);
    
    // Se não encontrar o arquivo específico, tenta carregar .env padrão na pasta env/
    const defaultEnvPath = path.resolve(process.cwd(), 'env', '.env.dev');
    const defaultResult = dotenv.config({ path: defaultEnvPath });  
    
    if (defaultResult.error) {
      // Se não encontrar na pasta env/, tenta na raiz
      const rootEnvPath = path.resolve(process.cwd(), '.env');
      const rootResult = dotenv.config({ path: rootEnvPath });
      
      if (rootResult.error) {
        console.warn('⚠️  Nenhum arquivo .env encontrado. Usando apenas variáveis de ambiente do sistema.');
      } else {
        console.log('✅ Arquivo .env da raiz carregado com sucesso.');
      }
    } else {
      console.log('✅ Arquivo env/.env padrão carregado com sucesso.');
    }
  } else {
    console.log(`✅ Arquivo env/${envFile} carregado com sucesso.`);
  }
  
  // Log das configurações carregadas (sem mostrar valores sensíveis)
  console.log(`🌍 Ambiente: ${nodeEnv}`);
  console.log(`📁 Arquivo carregado: env/${envFile}`);
};

/**
 * Função para validar se as variáveis obrigatórias estão presentes
 */
export const validateRequiredEnvVars = (): void => {
  const nodeEnv = process.env.NODE_ENV || 'dev';
  
  const requiredVars = {
    development: ['MONGO_URI'],
    dev: ['MONGO_URI'],
    staging: ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'],
    hml: ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'],
    production: ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'REDIS_HOST'],
    prod: ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'REDIS_HOST'],
  };
  
  const missingVars = requiredVars[nodeEnv as keyof typeof requiredVars] || [];
  const missing: string[] = [];
  
  for (const varName of missingVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error(`❌ Variáveis de ambiente obrigatórias não encontradas para ${nodeEnv}:`);
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Dica: Crie um arquivo .env.' + nodeEnv + ' com as variáveis necessárias.');
    process.exit(1);
  }
  
  console.log('✅ Todas as variáveis obrigatórias estão presentes.');
};

