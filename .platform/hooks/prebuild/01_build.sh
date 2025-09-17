#!/bin/bash

# Script para fazer build da aplicação no Beanstalk
echo "🏗️ Fazendo build da aplicação..."

# Instalar dependências
npm ci --production

# Fazer build
npm run build

echo "✅ Build concluído!"
