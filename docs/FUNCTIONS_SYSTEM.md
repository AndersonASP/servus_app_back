# 🎯 Sistema de Funções Reutilizável - Servus Backend

## 📋 **Visão Geral**

O sistema de funções reutilizável permite gerenciar um catálogo de funções por tenant, habilitar funções específicas para cada ministério e qualificar membros para essas funções. Isso substitui o sistema anterior onde as funções eram armazenadas como strings livres dentro dos ministérios.

## 🏗️ **Arquitetura**

### **1. Modelos de Domínio**

#### **Function (Catálogo de Funções)**
- **tenantId**: ID do tenant (multi-tenant)
- **name**: Nome da função (ex: "Baixista", "Sonoplasta")
- **slug**: Identificador único por tenant
- **category**: Categoria da função (music, media, welcome, etc.)
- **description**: Descrição opcional
- **level**: Nível opcional (beginner, intermediate, advanced, expert)
- **requirements**: Lista de requisitos opcionais
- **isActive**: Status ativo/inativo

#### **MinistryFunction (Habilitação por Ministério)**
- **ministry**: Referência ao ministério
- **function**: Referência à função do catálogo
- **tenantId**: ID do tenant
- **branchId**: ID da branch (opcional)
- **minSlotsDefault**: Quantidade mínima de slots padrão
- **isActive**: Status ativo/inativo

#### **MemberFunction (Qualificações de Membros)**
- **member**: Referência ao membro
- **ministry**: Referência ao ministério
- **function**: Referência à função
- **tenantId**: ID do tenant
- **branchId**: ID da branch (opcional)
- **status**: Status da qualificação (approved, in_training, blocked)
- **level**: Nível de proficiência (1-10)
- **priority**: Prioridade (low, medium, high, critical)
- **observations**: Observações opcionais
- **isActive**: Status ativo/inativo

### **2. APIs Backend**

#### **FunctionsController (`/functions`)**
- `POST /functions` - Criar função (tenant_admin)
- `GET /functions` - Listar funções com filtros
- `GET /functions/:id` - Buscar função por ID
- `PUT /functions/:id` - Atualizar função (tenant_admin)
- `DELETE /functions/:id` - Arquivar função (tenant_admin)

#### **Ministry Functions (`/functions/ministry`)**
- `POST /functions/ministry` - Habilitar função para ministério
- `GET /functions/ministry/:ministryId` - Listar funções do ministério
- `DELETE /functions/ministry/:ministryId/:functionId` - Desabilitar função

#### **Member Functions (`/functions/member`)**
- `POST /functions/member` - Criar qualificação de membro
- `GET /functions/member/:memberId` - Listar funções do membro
- `GET /functions/qualified/:ministryId/:functionId` - Listar membros qualificados
- `PUT /functions/member/:memberFunctionId` - Atualizar qualificação
- `DELETE /functions/member/:memberFunctionId` - Remover qualificação

### **3. Validações e Regras de Negócio**

#### **Validações Obrigatórias**
- Membros com roles `leader` ou `volunteer` devem ter pelo menos uma função válida no ministério
- Funções só podem ser arquivadas se não estiverem sendo usadas em ministérios
- Funções só podem ser desabilitadas de ministérios se não houver membros qualificados

#### **RBAC (Role-Based Access Control)**
- **tenant_admin**: Pode gerenciar todas as funções do tenant
- **branch_admin**: Pode gerenciar funções da sua branch
- **leader**: Pode gerenciar funções do seu ministério
- **volunteer**: Pode visualizar suas próprias qualificações

## 🚀 **Funcionalidades**

### **✅ Gestão de Funções**
- Criação e edição de funções com categorias e níveis
- Arquivamento de funções (soft delete)
- Busca e filtros por categoria, status, nome
- Validação de unicidade por tenant

### **✅ Habilitação por Ministério**
- Habilitar/desabilitar funções para ministérios específicos
- Definir quantidade mínima de slots padrão
- Validação de dependências antes de desabilitar

### **✅ Qualificações de Membros**
- Criar qualificações com status (aprovado/em treinamento/bloqueado)
- Definir nível de proficiência e prioridade
- Adicionar observações e requisitos
- Listar membros qualificados para escalas

### **✅ Integração com Templates e Escalas**
- Templates agora referenciam `functionId` ao invés de nomes livres
- Escalas filtram membros por qualificação aprovada
- Autoescala considera disponibilidade e qualificação

## 🔄 **Migração de Dados**

### **Script de Migração**
```bash
# Executar migração via API (servus_admin)
POST /migration/functions

# Ou executar diretamente
npm run migrate:functions
```

### **Processo de Migração**
1. **Extração**: Coleta funções únicas de `ministryFunctions` por tenant
2. **Normalização**: Consolida sinônimos e remove duplicatas
3. **Criação**: Cria catálogo de funções com categorias automáticas
4. **Mapeamento**: Cria vínculos `MinistryFunction` para cada ministério
5. **Conversão**: Migra associações para `MemberFunction` com status padrão
6. **Validação**: Executa checagens de integridade

### **Validação Pós-Migração**
```bash
# Executar testes de validação
npm run test:migration
```

## 📱 **Frontend Flutter**

### **Telas Implementadas**
- **FuncoesListScreen**: Listagem com filtros e paginação
- **FuncaoFormScreen**: Criação/edição de funções
- **FuncoesFilters**: Modal de filtros avançados

### **Modelos Flutter**
- **Funcao**: Modelo para funções do catálogo
- **FuncaoMinisterio**: Modelo para vínculos ministério-função
- **FuncaoMembro**: Modelo para qualificações de membros

### **Serviços**
- **FuncoesService**: Gerencia todas as operações HTTP
- **FuncoesController**: Gerencia estado da aplicação

## 🧪 **Testes**

### **Testes de Migração**
- Validação de contagens básicas
- Verificação de integridade dos dados
- Teste de amostras específicas
- Validação de regras de negócio

### **Testes de API**
- Testes unitários para validações
- Testes de integração para operações atômicas
- Testes E2E para fluxos completos

## 🔧 **Configuração e Uso**

### **1. Executar Migração**
```bash
# Via API (recomendado)
curl -X POST http://localhost:3000/migration/functions \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant-id>"

# Via script direto
npm run migrate:functions
```

### **2. Validar Migração**
```bash
npm run test:migration
```

### **3. Usar APIs**
```bash
# Listar funções
GET /functions?search=baixo&category=music&isActive=true

# Criar função
POST /functions
{
  "name": "Baixista",
  "category": "music",
  "description": "Responsável pelo baixo na equipe de louvor",
  "level": "intermediate",
  "requirements": ["Conhecimento musical", "Disponibilidade aos domingos"]
}

# Habilitar função para ministério
POST /functions/ministry
{
  "ministryId": "64a1b2c3d4e5f6789abcdef0",
  "functionId": "64a1b2c3d4e5f6789abcdef1",
  "minSlotsDefault": 2
}
```

## ⚠️ **Considerações Importantes**

### **Compatibilidade**
- Sistema mantém compatibilidade com dados existentes
- Fallbacks implementados para campos antigos
- Migração pode ser executada sem downtime

### **Performance**
- Índices otimizados para queries multi-tenant
- Paginação implementada em todas as listagens
- Cache de funções habilitadas por ministério

### **Segurança**
- RBAC respeitado em todas as operações
- Validação de tenant em todas as queries
- Sanitização de dados de entrada

## 📊 **Métricas e Monitoramento**

### **Logs Importantes**
- Criação/atualização de funções
- Habilitação/desabilitação por ministério
- Criação de qualificações de membros
- Erros de validação e permissões

### **Métricas Recomendadas**
- Número de funções por tenant
- Funções mais utilizadas por ministério
- Membros sem qualificações válidas
- Tempo de resposta das APIs

## 🔮 **Próximos Passos**

1. **Implementar cache Redis** para funções habilitadas
2. **Adicionar histórico de mudanças** nas qualificações
3. **Implementar notificações** para mudanças de status
4. **Criar relatórios** de qualificações por ministério
5. **Adicionar importação em lote** de funções

---

**Versão**: 1.0.0  
**Data**: 2024-01-XX  
**Autor**: Tech Lead Sênior
