#!/bin/bash

# Script de teste para API de Branches
# Execute este script para testar todas as funcionalidades do módulo de branches

BASE_URL="http://localhost:3000"
TENANT_ID="01990834-efc2-765b-a95e-279087c23748"  # Substitua pelo tenantId real
TOKEN="your-jwt-token-here"  # Substitua pelo token JWT real

echo "🏢 Testando API de Branches (Filiais)"
echo "======================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para fazer requisições
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${YELLOW}📋 $description${NC}"
    echo "🔗 $method $endpoint"
    
    if [ -n "$data" ]; then
        echo "📤 Dados: $data"
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            "$BASE_URL$endpoint")
    fi
    
    # Separar resposta e código HTTP
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ Sucesso (HTTP $http_code)${NC}"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ Erro (HTTP $http_code)${NC}"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    fi
}

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq não está instalado. Instale com: brew install jq${NC}"
    echo "As respostas JSON não serão formatadas."
fi

# Verificar se o token foi configurado
if [ "$TOKEN" = "your-jwt-token-here" ]; then
    echo -e "${RED}❌ Configure o TOKEN no script antes de executar${NC}"
    exit 1
fi

echo -e "\n${YELLOW}🔧 Configuração:${NC}"
echo "Base URL: $BASE_URL"
echo "Tenant ID: $TENANT_ID"
echo "Token: ${TOKEN:0:20}..."

# 1. Listar filiais existentes
make_request "GET" "/tenants/$TENANT_ID/branches" "" "Listar filiais existentes"

# 2. Criar nova filial
BRANCH_DATA='{
  "name": "Filial Centro",
  "description": "Filial localizada no centro da cidade",
  "endereco": {
    "cep": "01234-567",
    "rua": "Rua das Flores",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP",
    "complemento": "Sala 101"
  },
  "telefone": "(11) 99999-9999",
  "email": "centro@igreja.com",
  "whatsappOficial": "(11) 99999-9999",
  "diasCulto": [
    {
      "dia": "domingo",
      "horarios": ["09:00", "19:30"]
    },
    {
      "dia": "quarta",
      "horarios": ["19:30"]
    }
  ],
  "eventosPadrao": [
    {
      "nome": "Culto de Celebração",
      "dia": "domingo",
      "horarios": ["09:00", "19:30"],
      "tipo": "culto"
    }
  ],
  "modulosAtivos": ["voluntariado", "eventos", "financeiro"],
  "corTema": "#1E40AF",
  "idioma": "pt-BR",
  "timezone": "America/Sao_Paulo"
}'

make_request "POST" "/tenants/$TENANT_ID/branches" "$BRANCH_DATA" "Criar nova filial"

# 3. Criar filial com administrador
BRANCH_WITH_ADMIN_DATA='{
  "branchData": {
    "name": "Filial Norte",
    "description": "Filial da região norte da cidade",
    "endereco": {
      "cidade": "São Paulo",
      "estado": "SP",
      "bairro": "Vila Madalena"
    },
    "telefone": "(11) 88888-8888",
    "email": "norte@igreja.com"
  },
  "adminData": {
    "name": "João Silva",
    "email": "joao.silva@igreja.com",
    "password": "senha123456"
  }
}'

make_request "POST" "/tenants/$TENANT_ID/branches/with-admin" "$BRANCH_WITH_ADMIN_DATA" "Criar filial com administrador"

# 4. Listar filiais com filtros
make_request "GET" "/tenants/$TENANT_ID/branches?search=centro&page=1&limit=5" "" "Listar filiais com filtro de busca"

# 5. Obter detalhes de uma filial específica (assumindo que existe uma filial com branchId)
make_request "GET" "/tenants/$TENANT_ID/branches/filial-centro-123" "" "Obter detalhes de filial específica"

# 6. Atualizar filial
UPDATE_DATA='{
  "name": "Filial Centro Atualizada",
  "telefone": "(11) 77777-7777",
  "email": "centro.atualizado@igreja.com",
  "endereco": {
    "numero": "456"
  }
}'

make_request "PUT" "/tenants/$TENANT_ID/branches/filial-centro-123" "$UPDATE_DATA" "Atualizar dados da filial"

# 7. Listar filiais por cidade
make_request "GET" "/tenants/$TENANT_ID/branches?cidade=São Paulo" "" "Listar filiais por cidade"

# 8. Listar filiais ativas
make_request "GET" "/tenants/$TENANT_ID/branches?isActive=true" "" "Listar apenas filiais ativas"

# 9. Desativar filial
make_request "DELETE" "/tenants/$TENANT_ID/branches/filial-centro-123" "" "Desativar filial (soft delete)"

# 10. Listar filiais após desativação
make_request "GET" "/tenants/$TENANT_ID/branches" "" "Listar filiais após desativação"

# 11. Tentar criar filial além do limite (para testar validação de plano)
EXTRA_BRANCH_DATA='{
  "name": "Filial Extra",
  "description": "Esta filial deve falhar se o plano não permitir"
}'

make_request "POST" "/tenants/$TENANT_ID/branches" "$EXTRA_BRANCH_DATA" "Tentar criar filial além do limite (deve falhar se plano básico)"

echo -e "\n${GREEN}🎉 Testes concluídos!${NC}"
echo -e "\n${YELLOW}📝 Notas:${NC}"
echo "- Substitua TENANT_ID e TOKEN pelos valores reais"
echo "- Alguns testes podem falhar se as filiais não existirem"
echo "- Verifique os logs do servidor para mais detalhes"
echo "- Teste a validação de plano criando filiais até o limite"
