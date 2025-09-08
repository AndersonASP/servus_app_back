# Implementação da Padronização - Servus Backend

## Resumo das Mudanças Implementadas

Este documento descreve todas as mudanças implementadas para padronizar autenticação, multi-tenant e controle de permissões no Servus.

## 1. Tokens de Autenticação (snake_case)

### ✅ Implementado
- **DTOs atualizados**: `LoginResponseDto` e `RefreshTokenDto` agora usam `access_token`, `refresh_token`, `token_type`, `expires_in`
- **AuthService atualizado**: Retorna tokens em snake_case consistentemente
- **Removido**: `TokenMetadataDto` e variantes camelCase

### 📁 Arquivos Modificados
- `src/modules/auth/DTO/login-response.dto.ts`
- `src/modules/auth/DTO/refresh-token.dto.ts`
- `src/modules/auth/services/auth.service.ts`

## 2. Headers de Contexto (kebab-case)

### ✅ Implementado
- **Headers padronizados**: `x-tenant-id`, `x-branch-id`, `x-ministry-id`
- **Middleware atualizado**: Resolve contexto na ordem: `params` > `headers` > `subdomínio`
- **Interface estendida**: `TenantRequest` agora inclui `branchId` e `ministryId`

### 📁 Arquivos Modificados
- `src/common/middlewares/tenant.middleware.ts`

## 3. Sistema de Permissões

### ✅ Implementado
- **Constante `PERMS`**: Permissões atômicas organizadas por categoria
- **Mapeamento `ROLE_PERMISSIONS`**: Cada role tem suas permissões específicas
- **Hierarquia clara**:
  - `servus_admin`: Acesso global, `manage_all_tenants`
  - `tenant_admin`: Gerenciar tenant, usuários e branches
  - `branch_admin`: Gerenciar branch, voluntários e eventos locais
  - `leader`: Criar e gerenciar escalas, eventos e templates do ministério
  - `volunteer`: Consultar agenda própria e confirmar presença

### 📁 Arquivos Modificados
- `src/common/enums/role.enum.ts`

## 4. Decorator @RequiresPerm

### ✅ Implementado
- **Novo decorator**: `@RequiresPerm('perm')` ou `@RequiresPerm(['perm1', 'perm2'])`
- **Validação flexível**: Suporte para permissão única ou múltiplas
- **Opção `requireAll`**: Pode exigir todas as permissões ou pelo menos uma

### 📁 Arquivos Criados
- `src/common/decorators/requires-perm.decorator.ts`

## 5. PolicyGuard Atualizado

### ✅ Implementado
- **Bypass automático**: `servus_admin` sempre tem acesso global
- **Verificação de permissões**: Usa o novo sistema baseado em `@RequiresPerm`
- **Fallback**: Mantém compatibilidade com sistema antigo de `@Authorize`
- **Resolução de contexto**: Busca permissões do usuário dentro do membership

### 📁 Arquivos Modificados
- `src/common/guards/policy.guard.ts`

## 6. DTOs com Validação de Contexto

### ✅ Implementado
- **Classe base**: `ContextValidationDto` rejeita IDs de contexto no body
- **Herança**: DTOs de criação herdam da validação
- **Headers obrigatórios**: IDs devem vir de path params ou headers

### 📁 Arquivos Criados
- `src/common/dto/context-validation.dto.ts`

### 📁 Arquivos Modificados
- `src/modules/tenants/DTO/create-tenant.dto.ts`
- `src/modules/branches/DTO/create-branches.dto.ts`
- `src/modules/ministries/dto/create-ministry.dto.ts`

## 7. Rotas REST Canônicas

### ✅ Implementado
- **Tenants**: `POST /tenants`, `GET /tenants`
- **Branches**: `POST /tenants/:tenantId/branches`, `GET /tenants/:tenantId/branches`
- **Ministérios**: `POST /tenants/:tenantId/branches/:branchId/ministries`, `GET /tenants/:tenantId/branches/:branchId/ministries`
- **Eventos**: `POST /tenants/:tenantId/branches/:branchId/events`, `GET /tenants/:tenantId/branches/:branchId/events`
- **Templates**: `POST /tenants/:tenantId/branches/:branchId/templates`, `GET /tenants/:tenantId/branches/:branchId/templates`

### 📁 Arquivos Modificados
- `src/modules/tenants/controllers/tenants.controller.ts`
- `src/modules/branches/controllers/branches.controller.ts`
- `src/modules/ministries/controllers/ministries.controller.ts`
- `src/modules/events/events.controller.ts`
- `src/modules/templates/templates.controller.ts`
- `src/modules/users/users.controller.ts`

## 8. Respostas Padronizadas

### ✅ Implementado
- **Criações**: Retornam `201` + `Location` header
- **Headers de contexto**: Resolvidos automaticamente via middleware
- **Permissões**: Verificadas via `@RequiresPerm` em todos os controllers

## 9. Middleware de Tenant

### ✅ Implementado
- **Rotas de auth**: Não exigem tenant (`/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`)
- **Demais rotas**: Tenant obrigatório resolvido via contexto
- **Headers padrão**: `x-tenant-id`, `x-branch-id`, `x-ministry-id`

## 10. Refactors Repo-Wide

### ✅ Implementado
- **Tokens padronizados**: snake_case em todas as respostas de auth
- **Headers padronizados**: kebab-case em todo o sistema
- **Decorators atualizados**: `@RequiresPerm` substituindo `@Authorize` onde apropriado
- **Bypass global**: `servus_admin` tem acesso sem restrições

## Próximos Passos

### 🔄 Pendente
1. **Testes**: Executar testes unitários e de integração
2. **Validação**: Verificar se todas as rotas estão funcionando
3. **Documentação**: Atualizar documentação da API
4. **Frontend**: Atualizar cliente para usar novos headers e rotas

### 📋 Verificações
- [ ] Todos os controllers estão usando `@RequiresPerm`
- [ ] Rotas REST canônicas estão funcionando
- [ ] Headers de contexto estão sendo resolvidos corretamente
- [ ] Sistema de permissões está funcionando
- [ ] Bypass para `servus_admin` está funcionando

## Benefícios da Implementação

1. **Consistência**: Padrão único para tokens e headers
2. **Segurança**: Sistema de permissões granular e seguro
3. **Manutenibilidade**: Código mais limpo e organizado
4. **Escalabilidade**: Estrutura preparada para crescimento
5. **Padrões REST**: Rotas canônicas e respostas padronizadas
6. **Flexibilidade**: Sistema de permissões adaptável às necessidades 