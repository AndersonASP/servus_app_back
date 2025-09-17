#!/bin/bash

# Script de Deploy Manual para AWS Elastic Beanstalk
# Este script faz o build local e envia apenas os arquivos necessários

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Nome do ambiente
ENVIRONMENT=${1:-Servus-Back-Env}

log "🚀 Iniciando deploy manual para ambiente: $ENVIRONMENT"

# 1. Limpar build anterior
log "🧹 Limpando build anterior..."
rm -rf dist/

# 2. Instalar dependências
log "📦 Instalando dependências..."
npm ci --production

# 3. Build do projeto
log "🏗️ Fazendo build do projeto..."
npm run build

if [ $? -ne 0 ]; then
    error "Build falhou!"
    exit 1
fi

log "✅ Build concluído com sucesso"

# 4. Verificar se dist/main.js existe
if [ ! -f "dist/main.js" ]; then
    error "Arquivo dist/main.js não encontrado após build!"
    exit 1
fi

log "✅ Arquivo dist/main.js encontrado"

# 5. Fazer deploy
log "🚀 Fazendo deploy..."
eb deploy "$ENVIRONMENT"

if [ $? -ne 0 ]; then
    error "Deploy falhou!"
    exit 1
fi

# 6. Verificar status
log "📊 Verificando status do ambiente..."
eb status "$ENVIRONMENT"

# 7. Obter URL e testar
log "🌐 Testando aplicação..."
URL=$(eb status "$ENVIRONMENT" | grep "CNAME" | awk '{print $2}')
if [ ! -z "$URL" ]; then
    log "✅ Aplicação disponível em: http://$URL"
    
    # Aguardar um pouco para a aplicação inicializar
    sleep 10
    
    # Testar health check
    log "🔍 Testando health check..."
    if curl -s "http://$URL/health" | grep -q "OK\|ok\|healthy"; then
        log "✅ Health check passou!"
    else
        warn "⚠️ Health check falhou, mas deploy foi concluído"
    fi
fi

log "🎉 Deploy manual concluído com sucesso!"
