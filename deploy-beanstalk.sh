#!/bin/bash

# Script de Deploy para AWS Elastic Beanstalk
# Uso: ./deploy-beanstalk.sh [environment-name]

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

# Verificar se EB CLI está instalado
if ! command -v eb &> /dev/null; then
    error "EB CLI não está instalado. Instale com: pip install awsebcli --upgrade --user"
    exit 1
fi

# Verificar se AWS CLI está configurado
if ! aws sts get-caller-identity &> /dev/null; then
    error "AWS CLI não está configurado. Execute: aws configure"
    exit 1
fi

# Nome do ambiente (padrão: servus-backend-prod)
ENVIRONMENT=${1:-servus-backend-prod}

log "🚀 Iniciando deploy para ambiente: $ENVIRONMENT"

# 1. Build do projeto
log "📦 Fazendo build do projeto..."
npm run build

if [ $? -ne 0 ]; then
    error "Build falhou!"
    exit 1
fi

log "✅ Build concluído com sucesso"

# 2. Verificar se o ambiente existe
log "🔍 Verificando ambiente..."
if ! eb list | grep -q "$ENVIRONMENT"; then
    warn "Ambiente $ENVIRONMENT não encontrado. Criando..."
    eb create "$ENVIRONMENT"
fi

# 3. Fazer deploy
log "🚀 Fazendo deploy..."
eb deploy "$ENVIRONMENT"

if [ $? -ne 0 ]; then
    error "Deploy falhou!"
    exit 1
fi

# 4. Verificar status
log "📊 Verificando status do ambiente..."
eb status "$ENVIRONMENT"

# 5. Obter URL
log "🌐 Obtendo URL da aplicação..."
URL=$(eb status "$ENVIRONMENT" | grep "CNAME" | awk '{print $2}')
if [ ! -z "$URL" ]; then
    log "✅ Aplicação disponível em: http://$URL"
    log "🔍 Health check: http://$URL/health"
fi

log "🎉 Deploy concluído com sucesso!"
