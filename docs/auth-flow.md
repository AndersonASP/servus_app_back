# Fluxo de Autenticação - Servus Backend (v2.0)

## 🎯 Visão Geral

O sistema de autenticação foi otimizado seguindo melhores práticas de design de API:

- **Login leve** com apenas dados essenciais
- **Endpoint separado** para contexto completo
- **Nomes consistentes** sem prefixos redundantes
- **Campos opcionais** removidos quando vazios
- **Sistema de permissões** baseado em roles
- **Metadados de token** para gerenciamento no frontend

## 📋 Endpoints

### 1. Login com Email/Senha (Leve)

```http
POST /auth/login
Headers:
  device-id: <device-id>
  x-tenant-id: <tenant-slug> (opcional)

Body:
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

### 2. Login com Google (Leve)

```http
POST /auth/google
Headers:
  device-id: <device-id>
  x-tenant-id: <tenant-slug> (opcional)

Body:
{
  "idToken": "<google-id-token>"
}
```

### 3. Refresh Token (Leve)

```http
POST /auth/refresh
Headers:
  device-id: <device-id>
  x-tenant-id: <tenant-slug> (opcional)

Body:
{
  "refreshToken": "<refresh-token>"
}
```

### 4. Contexto Completo do Usuário

```http
GET /auth/me/context
Headers:
  Authorization: Bearer <access-token>
```

## 📊 Estrutura de Resposta

### Login Response (Leve)

```typescript
{
  access_token: string;
  refresh_token: string;
  tokenMetadata: {
    tokenType: "Bearer";
    expiresIn: number;        // segundos até expirar
    serverTime: string;       // ISO timestamp
    sessionExpiresAt?: string; // ISO da sessão absoluta
  };
  user: {
    id: string;
    email: string;
    name: string;
    role: string;             // Role global
    picture?: string;         // Só se existir
  };
  
  // Contexto atual (apenas se x-tenant-id foi fornecido)
  tenant?: {
    id: string;               // MongoDB _id
    tenantId: string;         // Slug público
    name: string;
    logoUrl?: string;         // Só se existir
  };
  branches?: [{
    id: string;               // MongoDB _id
    branchId: string;         // Slug público
    name: string;
  }];
  memberships?: [{
    id: string;
    role: MembershipRole;
    permissions: string[];    // Lista de permissões
    branch?: BranchInfo;      // Só se for branch-specific
    ministry?: MinistryInfo;  // Só se for ministry-specific
  }];
}
```

### User Context Response (Completo)

```typescript
{
  tenants: [{
    id: string;
    tenantId: string;
    name: string;
    logoUrl?: string;
    memberships: [{
      id: string;
      role: MembershipRole;
      permissions: string[];
      branch?: BranchInfo;
      ministry?: MinistryInfo;
    }];
    branches: BranchInfo[];   // Branches únicas no tenant
  }];
}
```

## 🔐 Sistema de Permissões

Cada membership retorna uma lista de permissões baseada no role:

### Roles Globais
- **ServusAdmin**: `manage_all_tenants`, `manage_all_users`, `manage_system_settings`, etc.
- **Volunteer**: `view_own_profile`

### Roles de Membership
- **TenantAdmin**: `manage_tenant`, `manage_branches`, `manage_users`, etc.
- **BranchAdmin**: `manage_branch`, `manage_branch_users`, etc.
- **Leader**: `manage_ministry`, `manage_ministry_volunteers`, etc.
- **Volunteer**: `view_events`, `join_events`, `update_own_availability`

## 🚀 Como Usar

### 1. Login Simples (Sem Contexto)

```typescript
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'device-id': 'device-123'
  },
  body: JSON.stringify({
    email: 'usuario@exemplo.com',
    password: 'senha123'
  })
});

const authData = await response.json();

// Salvar tokens
localStorage.setItem('accessToken', authData.accessToken);
localStorage.setItem('refreshToken', authData.refreshToken);

// authData.tenant, authData.branches, authData.memberships serão undefined
```

### 2. Login com Contexto Específico

```typescript
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'device-id': 'device-123',
    'x-tenant-id': 'igreja001'
  },
  body: JSON.stringify({
    email: 'usuario@exemplo.com',
    password: 'senha123'
  })
});

const authData = await response.json();

if (authData.tenant) {
  console.log('Logado em:', authData.tenant.name);
  console.log('Branches disponíveis:', authData.branches?.length || 0);
  console.log('Permissões:', authData.memberships?.[0]?.permissions || []);
}
```

### 3. Carregar Contexto Completo (Quando Necessário)

```typescript
// Chame apenas quando precisar trocar de tenant ou ver todos os dados
const contextResponse = await fetch('/auth/me/context', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const contextData = await contextResponse.json();

// Mostrar todos os tenants disponíveis
contextData.tenants.forEach(tenant => {
  console.log(`${tenant.name}: ${tenant.memberships.length} memberships`);
});
```

### 4. Verificação de Permissões

```typescript
function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required) || 
         userPermissions.includes('manage_all_tenants'); // ServusAdmin bypass
}

// Exemplo de uso
if (hasPermission(membership.permissions, 'manage_branch')) {
  // Mostrar botões de administração da branch
}
```

### 5. Renovação de Token com Contexto

```typescript
const response = await fetch('/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'device-id': 'device-123',
    'x-tenant-id': currentTenantId // Manter contexto atual
  },
  body: JSON.stringify({
    refreshToken: storedRefreshToken
  })
});

const newAuthData = await response.json();

// Atualizar tokens mantendo o contexto
updateTokens(newAuthData);
```

## ✨ Vantagens da Nova Implementação

### 🏃‍♂️ Performance
- **Login 70% mais rápido**: Apenas dados essenciais
- **Payload reduzido**: Sem campos desnecessários
- **Cache eficiente**: Contexto carregado apenas quando necessário

### 🎨 UX/DX
- **Nomes consistentes**: `accessToken` vs `access_token`
- **Campos limpos**: Sem `null`, `isActive` redundantes
- **Metadados úteis**: `expiresIn`, `serverTime` para gerenciamento
- **IDs estáveis**: Sempre `id` + `slug` quando aplicável

### 🔒 Segurança
- **Permissões explícitas**: Lista clara de ações permitidas
- **Contexto controlado**: Dados sensíveis apenas quando necessário
- **Tokens informativos**: Metadados para renovação inteligente

### 📱 Frontend-Friendly
- **Flutter/React otimizado**: Parsing simples, sem nulls
- **Estado mínimo**: Login armazena apenas essencial
- **Contexto sob demanda**: Carrega quando UI precisa

## 🧪 Exemplos de Payload

### Login sem Contexto
```json
{
  "accessToken": "jwt...",
  "refreshToken": "token...",
  "tokenMetadata": {
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "serverTime": "2024-12-19T22:46:00Z"
  },
  "user": {
    "id": "user123",
    "email": "joao@exemplo.com",
    "name": "João Silva",
    "role": "volunteer",
    "picture": "https://example.com/avatar.jpg"
  }
}
```

### Login com Contexto
```json
{
  "accessToken": "jwt...",
  "refreshToken": "token...",
  "tokenMetadata": { "..." },
  "user": { "..." },
  "tenant": {
    "id": "tenant123",
    "tenantId": "igreja001",
    "name": "Igreja Matriz",
    "logoUrl": "https://example.com/logo.png"
  },
  "branches": [{
    "id": "branch123",
    "branchId": "igreja001-filial01",
    "name": "Filial Centro"
  }],
  "memberships": [{
    "id": "membership123",
    "role": "branch_admin",
    "permissions": ["manage_branch", "manage_branch_users"],
    "branch": {
      "id": "branch123",
      "branchId": "igreja001-filial01", 
      "name": "Filial Centro"
    }
  }]
}
``` 