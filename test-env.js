#!/usr/bin/env node

/**
 * Script de teste para verificar se a configuração de ambiente está funcionando
 * Uso: node test-env.js [dev|hom|prod]
 */

const { loadEnvironmentFile, validateRequiredEnvVars } = require('./dist/config/dotenv.config');

function testEnvironment(env) {
  console.log(`🧪 Testando configuração para ambiente: ${env}`);
  console.log('=' .repeat(50));
  
  // Define o ambiente
  process.env.NODE_ENV = env;
  
  try {
    // Carrega o arquivo de ambiente
    loadEnvironmentFile();
    
    // Valida as variáveis obrigatórias
    validateRequiredEnvVars();
    
    console.log('✅ Configuração carregada com sucesso!');
    console.log('');
    console.log('📋 Variáveis carregadas:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   PORT: ${process.env.PORT}`);
    console.log(`   MONGO_URI: ${process.env.MONGO_URI ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   JWT_ACCESS_SECRET: ${process.env.JWT_ACCESS_SECRET ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   REDIS_HOST: ${process.env.REDIS_HOST ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   MAIL_USER: ${process.env.MAIL_USER ? '✅ Configurado' : '❌ Não configurado'}`);
    
  } catch (error) {
    console.error('❌ Erro na configuração:');
    console.error(`   ${error.message}`);
    console.log('');
    console.log('💡 Dica: Execute "npm run setup:env:' + env + '" para criar o arquivo de configuração.');
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const env = args[0] || 'dev';
  
  if (!['dev', 'hom', 'prod'].includes(env)) {
    console.log('❌ Ambiente inválido. Use: dev, hom ou prod');
    process.exit(1);
  }
  
  testEnvironment(env);
}

main();

