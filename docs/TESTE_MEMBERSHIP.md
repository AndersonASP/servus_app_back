# 🧪 Guia de Testes - Sistema de Vínculo de Membros

## 📋 Índice
1. [Preparação](#preparação)
2. [Testes Automatizados](#testes-automatizados)
3. [Testes Manuais](#testes-manuais)
4. [Testes com Postman](#testes-com-postman)
5. [Testes no Frontend](#testes-no-frontend)
6. [Debugging](#debugging)

---

## 🚀 Preparação

### 1. Verificar Ambiente
```bash
# Verificar se o backend está rodando
curl -X GET "http://localhost:3000/health"

# Verificar se o MongoDB está conectado
# (verificar logs do servidor)
```

### 2. Dados de Teste
```json
{
  "tenantId": "test-tenant-123",
  "branchId": "test-branch-456", 
  "ministryId": "test-ministry-789",
  "userId": "test-user-001",
  "token": "seu-token-de-autenticacao"
}
```

---

## 🤖 Testes Automatizados

### Executar Script de Testes
```bash
# Executar todos os testes
./test-membership-api.sh

# Ou executar individualmente
curl -X POST "http://localhost:3000/memberships/tenants/test-tenant-123/ministries/test-ministry-789/volunteers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token" \
  -H "device-id: test-device" \
  -H "x-tenant-id: test-tenant-123" \
  -d '{"userId":"test-user-001","role":"volunteer","isActive":true}'
```

### Resultados Esperados
- ✅ **Status 201**: Criação bem-sucedida
- ✅ **Status 200**: Listagem bem-sucedida
- ✅ **Status 204**: Remoção bem-sucedida
- ❌ **Status 401**: Erro de autenticação
- ❌ **Status 403**: Erro de permissão
- ❌ **Status 400**: Erro de validação

---

## 🖱️ Testes Manuais

### 1. Adicionar Voluntário (Matriz)
```bash
curl -X POST "http://localhost:3000/memberships/tenants/SEU_TENANT/ministries/SEU_MINISTERIO/volunteers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "device-id: SEU_DEVICE" \
  -H "x-tenant-id: SEU_TENANT" \
  -d '{
    "userId": "ID_DO_USUARIO",
    "role": "volunteer",
    "isActive": true
  }'
```

### 2. Adicionar Voluntário (Filial)
```bash
curl -X POST "http://localhost:3000/memberships/tenants/SEU_TENANT/branches/SUA_FILIAL/ministries/SEU_MINISTERIO/volunteers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "device-id: SEU_DEVICE" \
  -H "x-tenant-id: SEU_TENANT" \
  -H "x-branch-id: SUA_FILIAL" \
  -d '{
    "userId": "ID_DO_USUARIO",
    "role": "volunteer",
    "isActive": true
  }'
```

### 3. Adicionar Líder
```bash
curl -X POST "http://localhost:3000/memberships/tenants/SEU_TENANT/ministries/SEU_MINISTERIO/leaders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "device-id: SEU_DEVICE" \
  -H "x-tenant-id: SEU_TENANT" \
  -d '{
    "userId": "ID_DO_USUARIO",
    "role": "leader",
    "isActive": true
  }'
```

### 4. Listar Membros
```bash
# Listar todos os membros
curl -X GET "http://localhost:3000/memberships/tenants/SEU_TENANT/ministries/SEU_MINISTERIO/members?page=1&limit=10" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "device-id: SEU_DEVICE" \
  -H "x-tenant-id: SEU_TENANT"

# Listar com filtros
curl -X GET "http://localhost:3000/memberships/tenants/SEU_TENANT/ministries/SEU_MINISTERIO/members?page=1&limit=10&role=volunteer&search=nome" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "device-id: SEU_DEVICE" \
  -H "x-tenant-id: SEU_TENANT"
```

### 5. Atualizar Role
```bash
curl -X POST "http://localhost:3000/memberships/tenants/SEU_TENANT/ministries/SEU_MINISTERIO/members/MEMBERSHIP_ID/update-role" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "device-id: SEU_DEVICE" \
  -H "x-tenant-id: SEU_TENANT" \
  -d '{
    "role": "leader",
    "isActive": true
  }'
```

### 6. Remover Membro
```bash
curl -X DELETE "http://localhost:3000/memberships/tenants/SEU_TENANT/ministries/SEU_MINISTERIO/members/MEMBERSHIP_ID" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "device-id: SEU_DEVICE" \
  -H "x-tenant-id: SEU_TENANT"
```

---

## 📮 Testes com Postman

### 1. Configurar Collection
```json
{
  "name": "Membership API Tests",
  "variables": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "tenantId",
      "value": "SEU_TENANT"
    },
    {
      "key": "ministryId", 
      "value": "SEU_MINISTERIO"
    },
    {
      "key": "token",
      "value": "SEU_TOKEN"
    }
  ]
}
```

### 2. Headers Globais
```
Authorization: Bearer {{token}}
device-id: SEU_DEVICE
x-tenant-id: {{tenantId}}
Content-Type: application/json
```

### 3. Requests de Exemplo

#### Adicionar Voluntário
```
POST {{baseUrl}}/memberships/tenants/{{tenantId}}/ministries/{{ministryId}}/volunteers
Body:
{
  "userId": "ID_DO_USUARIO",
  "role": "volunteer",
  "isActive": true
}
```

#### Listar Membros
```
GET {{baseUrl}}/memberships/tenants/{{tenantId}}/ministries/{{ministryId}}/members?page=1&limit=10
```

---

## 📱 Testes no Frontend

### 1. Testar Contagem de Membros
```dart
// No controller de detalhes do ministério
await _membershipService.getMinistryMembersCount(
  tenantId: tenantId,
  branchId: branchId,
  ministryId: ministerioId,
);
```

### 2. Testar Listagem de Membros
```dart
// Listar membros
final members = await _membershipService.getMinistryMembers(
  tenantId: tenantId,
  branchId: branchId,
  ministryId: ministerioId,
  page: 1,
  limit: 20,
);
```

### 3. Testar Adição de Membros
```dart
// Adicionar voluntário
await _membershipService.addVolunteerToMinistry(
  tenantId: tenantId,
  branchId: branchId,
  ministryId: ministerioId,
  userId: userId,
);

// Adicionar líder
await _membershipService.addLeaderToMinistry(
  tenantId: tenantId,
  branchId: branchId,
  ministryId: ministerioId,
  userId: userId,
);
```

### 4. Testar Remoção de Membros
```dart
// Remover membro
await _membershipService.removeMinistryMember(
  tenantId: tenantId,
  branchId: branchId,
  ministryId: ministerioId,
  membershipId: membershipId,
);
```

---

## 🐛 Debugging

### 1. Logs do Backend
```bash
# Verificar logs do servidor
tail -f logs/server.log

# Ou no console do servidor NestJS
# Procure por mensagens como:
# 🔗 Adicionando voluntário ao ministério...
# ✅ Voluntário adicionado com sucesso
# ❌ Erro ao adicionar voluntário...
```

### 2. Verificar Banco de Dados
```javascript
// No MongoDB Compass ou shell
db.memberships.find({
  tenant: ObjectId("SEU_TENANT_ID"),
  ministry: ObjectId("SEU_MINISTERIO_ID")
})

// Verificar índices
db.memberships.getIndexes()
```

### 3. Testar Permissões
```bash
# Testar com diferentes roles
# 1. ServusAdmin - deve ter acesso total
# 2. TenantAdmin - deve ter acesso total
# 3. BranchAdmin - deve ter acesso limitado
# 4. Leader - deve ter acesso limitado
# 5. Volunteer - não deve ter acesso
```

### 4. Verificar Headers
```bash
# Verificar se todos os headers estão sendo enviados
curl -v -X POST "http://localhost:3000/memberships/tenants/SEU_TENANT/ministries/SEU_MINISTERIO/volunteers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "device-id: SEU_DEVICE" \
  -H "x-tenant-id: SEU_TENANT" \
  -d '{"userId":"ID_DO_USUARIO","role":"volunteer","isActive":true}'
```

---

## ✅ Checklist de Testes

### Funcionalidades Básicas
- [ ] Adicionar voluntário (matriz)
- [ ] Adicionar voluntário (filial)
- [ ] Adicionar líder (matriz)
- [ ] Adicionar líder (filial)
- [ ] Listar membros (matriz)
- [ ] Listar membros (filial)
- [ ] Buscar com filtros
- [ ] Atualizar role
- [ ] Remover membro

### Validações
- [ ] Usuário duplicado
- [ ] Ministério inexistente
- [ ] Tenant inexistente
- [ ] Permissões insuficientes
- [ ] Dados inválidos

### Cenários de Erro
- [ ] Token inválido
- [ ] Token expirado
- [ ] Headers faltando
- [ ] IDs inválidos
- [ ] Banco indisponível

### Performance
- [ ] Tempo de resposta < 2s
- [ ] Paginação funcionando
- [ ] Índices otimizados
- [ ] Sem memory leaks

---

## 🎯 Próximos Passos

1. **Testes de Integração**: Testar com dados reais
2. **Testes de Performance**: Load testing
3. **Testes de Segurança**: Penetration testing
4. **Testes de UI**: Testar no frontend
5. **Testes de Regressão**: Automatizar com CI/CD

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor
2. Confirme se o MongoDB está rodando
3. Valide os tokens de autenticação
4. Verifique as permissões do usuário
5. Teste com dados de exemplo primeiro
