import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Configuração do dotenv para carregar apenas o arquivo .env da raiz do projeto
 * Em produção, as variáveis de ambiente são configuradas diretamente no serviço de hospedagem
 */
export const loadEnvironmentFile = (): void => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Em produção, usar apenas variáveis de ambiente do sistema
  if (nodeEnv === 'production') {
    console.log('🌍 Ambiente: PRODUÇÃO - Usando apenas variáveis de ambiente do sistema');
    console.log('📁 Não carregando arquivo .env em produção');
    return;
  }
  
  // Em desenvolvimento, tentar carregar o arquivo .env
  const envPath = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.warn('⚠️  Arquivo .env não encontrado na raiz. Usando apenas variáveis de ambiente do sistema.');
    console.log('💡 Para desenvolvimento local, crie um arquivo .env na raiz do projeto.');
  } else {
    console.log('✅ Arquivo .env da raiz carregado com sucesso.');
  }
  
  // Log das configurações carregadas (sem mostrar valores sensíveis)
  console.log(`🌍 Ambiente: ${nodeEnv}`);
  console.log(`📁 Arquivo carregado: .env`);
};

/**
 * Função para validar se as variáveis obrigatórias estão presentes
 */
export const validateRequiredEnvVars = (): void => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Variáveis obrigatórias para todos os ambientes
  const requiredVars = ['MONGO_URI'];
  
  // Variáveis adicionais para produção
  if (nodeEnv === 'production') {
    requiredVars.push('JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET');
  }
  
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error(`❌ Variáveis de ambiente obrigatórias não encontradas para ${nodeEnv}:`);
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Dica: Crie um arquivo .env na raiz do projeto com as variáveis necessárias.');
    console.error('💡 Para produção, configure as variáveis diretamente no serviço de hospedagem.');
    process.exit(1);
  }
  
  console.log('✅ Todas as variáveis obrigatórias estão presentes.');
};

