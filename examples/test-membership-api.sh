#!/bin/bash

# 🧪 Script de Testes - Sistema de Vínculo de Membros
# Autor: ServusApp
# Data: $(date)

echo "🧪 Iniciando testes do Sistema de Vínculo de Membros..."
echo "=================================================="

# Configurações
BASE_URL="http://localhost:3000"
TENANT_ID="test-tenant-123"
BRANCH_ID="test-branch-456"
MINISTRY_ID="test-ministry-789"
USER_ID="test-user-001"
MEMBERSHIP_ID=""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Função para fazer requisições
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo ""
    log_info "Testando: $description"
    echo "URL: $BASE_URL$endpoint"
    echo "Method: $method"
    
    if [ -n "$data" ]; then
        echo "Data: $data"
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer test-token" \
            -H "device-id: test-device" \
            -H "x-tenant-id: $TENANT_ID" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer test-token" \
            -H "device-id: test-device" \
            -H "x-tenant-id: $TENANT_ID")
    fi
    
    # Separar body e status code
    body=$(echo "$response" | head -n -1)
    status_code=$(echo "$response" | tail -n 1)
    
    echo "Status Code: $status_code"
    echo "Response: $body"
    
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        log_success "Teste passou!"
        
        # Extrair membership ID se for criação
        if [[ "$endpoint" == *"/volunteers" ]] || [[ "$endpoint" == *"/leaders" ]]; then
            MEMBERSHIP_ID=$(echo "$body" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
            if [ -n "$MEMBERSHIP_ID" ]; then
                echo "Membership ID extraído: $MEMBERSHIP_ID"
            fi
        fi
    else
        log_error "Teste falhou!"
    fi
    
    echo "----------------------------------------"
}

echo ""
log_info "🔧 Configurações de Teste:"
echo "   - Base URL: $BASE_URL"
echo "   - Tenant ID: $TENANT_ID"
echo "   - Branch ID: $BRANCH_ID"
echo "   - Ministry ID: $MINISTRY_ID"
echo "   - User ID: $USER_ID"

echo ""
log_warning "⚠️  Nota: Este script usa tokens de teste. Em produção, use tokens reais."

# ========================================
# 🧪 TESTE 1: Adicionar Voluntário (Matriz)
# ========================================
make_request "POST" "/memberships/tenants/$TENANT_ID/ministries/$MINISTRY_ID/volunteers" \
    '{"userId":"'$USER_ID'","role":"volunteer","isActive":true}' \
    "Adicionar Voluntário ao Ministério (Matriz)"

# ========================================
# 🧪 TESTE 2: Adicionar Voluntário (Filial)
# ========================================
make_request "POST" "/memberships/tenants/$TENANT_ID/branches/$BRANCH_ID/ministries/$MINISTRY_ID/volunteers" \
    '{"userId":"'$USER_ID'","role":"volunteer","isActive":true}' \
    "Adicionar Voluntário ao Ministério (Filial)"

# ========================================
# 🧪 TESTE 3: Adicionar Líder (Matriz)
# ========================================
make_request "POST" "/memberships/tenants/$TENANT_ID/ministries/$MINISTRY_ID/leaders" \
    '{"userId":"'$USER_ID'","role":"leader","isActive":true}' \
    "Adicionar Líder ao Ministério (Matriz)"

# ========================================
# 🧪 TESTE 4: Adicionar Líder (Filial)
# ========================================
make_request "POST" "/memberships/tenants/$TENANT_ID/branches/$BRANCH_ID/ministries/$MINISTRY_ID/leaders" \
    '{"userId":"'$USER_ID'","role":"leader","isActive":true}' \
    "Adicionar Líder ao Ministério (Filial)"

# ========================================
# 🧪 TESTE 5: Listar Membros (Matriz)
# ========================================
make_request "GET" "/memberships/tenants/$TENANT_ID/ministries/$MINISTRY_ID/members?page=1&limit=10" \
    "" \
    "Listar Membros do Ministério (Matriz)"

# ========================================
# 🧪 TESTE 6: Listar Membros (Filial)
# ========================================
make_request "GET" "/memberships/tenants/$TENANT_ID/branches/$BRANCH_ID/ministries/$MINISTRY_ID/members?page=1&limit=10" \
    "" \
    "Listar Membros do Ministério (Filial)"

# ========================================
# 🧪 TESTE 7: Buscar Membros com Filtros
# ========================================
make_request "GET" "/memberships/tenants/$TENANT_ID/ministries/$MINISTRY_ID/members?page=1&limit=10&role=volunteer&search=test" \
    "" \
    "Buscar Membros com Filtros (Role + Search)"

# ========================================
# 🧪 TESTE 8: Atualizar Role (se membership foi criado)
# ========================================
if [ -n "$MEMBERSHIP_ID" ]; then
    make_request "POST" "/memberships/tenants/$TENANT_ID/ministries/$MINISTRY_ID/members/$MEMBERSHIP_ID/update-role" \
        '{"role":"leader","isActive":true}' \
        "Atualizar Role do Membro"
else
    log_warning "⚠️  Não foi possível testar atualização de role (membership ID não encontrado)"
fi

# ========================================
# 🧪 TESTE 9: Remover Membro (se membership foi criado)
# ========================================
if [ -n "$MEMBERSHIP_ID" ]; then
    make_request "DELETE" "/memberships/tenants/$TENANT_ID/ministries/$MINISTRY_ID/members/$MEMBERSHIP_ID" \
        "" \
        "Remover Membro do Ministério"
else
    log_warning "⚠️  Não foi possível testar remoção de membro (membership ID não encontrado)"
fi

echo ""
log_info "🎉 Testes concluídos!"
echo "=================================================="
echo ""
log_info "📊 Resumo dos Testes:"
echo "   - ✅ Adicionar Voluntários (Matriz e Filial)"
echo "   - ✅ Adicionar Líderes (Matriz e Filial)"
echo "   - ✅ Listar Membros (Matriz e Filial)"
echo "   - ✅ Buscar com Filtros"
echo "   - ✅ Atualizar Roles"
echo "   - ✅ Remover Membros"
echo ""
log_info "🔧 Para testar com dados reais:"
echo "   1. Substitua os IDs de teste pelos IDs reais"
echo "   2. Use tokens de autenticação válidos"
echo "   3. Verifique as permissões do usuário"
echo ""
log_info "📝 Logs do Backend:"
echo "   - Verifique o console do servidor para logs detalhados"
echo "   - Procure por mensagens de debug e erro"
