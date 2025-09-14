#!/bin/bash

# Script de deploy rápido para EC2
# Execute este script no servidor EC2

set -e

echo "🚀 Deploy rápido do Servus Backend..."

# Ir para diretório da aplicação
cd /var/www/servus-backend

# Parar aplicação
echo "⏹️ Parando aplicação..."
pm2 stop servus-backend || true

# Atualizar código
echo "📥 Atualizando código..."
git pull origin main

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci --production

# Build da aplicação
echo "🔨 Fazendo build..."
npm run build:prod

# Iniciar aplicação
echo "▶️ Iniciando aplicação..."
pm2 start ecosystem.config.js

# Verificar status
echo "✅ Verificando status..."
pm2 status

echo "🎉 Deploy concluído!"
echo "🌐 Aplicação disponível em: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
