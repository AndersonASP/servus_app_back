# Sistema Hierárquico de Criação - Servus Backend

## 🎯 Visão Geral

O sistema implementa uma hierarquia rígida de criação que respeita os níveis de permissão. **Cada funcionalidade está organizada no seu módulo correspondente** para melhor organização e manutenibilidade:

```
ServusAdmin
    ↓
    ├── Cria Tenants + TenantAdmins (opcional) → Módulo: Tenants
    │
    └── TenantAdmin
        ↓
        ├── Cria Branches + BranchAdmins (opcional) → Módulo: Branches
        │
        └── BranchAdmin
            ↓
            ├── Cria Leaders
            │
            └── Leader
                ↓
                └── Cria Volunteers → Módulo: Users
```

## 🔐 Regras de Permissão

### 1. **ServusAdmin** (Super Admin)
- ✅ Pode criar **Tenants** (com ou sem TenantAdmin)
- ✅ Pode criar **Branches** + **BranchAdmins** em qualquer tenant
- ✅ Pode criar **Leaders** e **Volunteers** em qualquer contexto
- ✅ Acesso total ao sistema

### 2. **TenantAdmin** (Admin da Igreja Matriz)
- ✅ Pode criar **Branches** (com ou sem BranchAdmin) no seu tenant
- ✅ Pode criar **Leaders** e **Volunteers** no seu tenant
- ❌ **NÃO** pode criar outros **TenantAdmins**
- ❌ **NÃO** pode criar usuários em outros tenants

### 3. **BranchAdmin** (Admin da Filial)
- ✅ Pode criar **Leaders** e **Volunteers** na sua branch
- ❌ **NÃO** pode criar **BranchAdmins** ou **TenantAdmins**
- ❌ **NÃO** pode criar usuários em outras branches

### 4. **Leader** (Líder de Ministério)
- ✅ Pode criar **Volunteers** no seu ministry/branch
- ❌ **NÃO** pode criar **Admins** ou **Leaders**
- ❌ **NÃO** pode criar usuários em outros ministérios

### 5. **Volunteer** (Voluntário)
- ❌ **NÃO** pode criar nenhum usuário
- ❌ **NÃO** pode criar **Tenants**, **Branches** ou **Ministries**

## 🚀 Endpoints da API (Organizados por Módulo)

### 🏢 **Módulo: Tenants** (`/tenants`)

#### 1. Criar Tenant + TenantAdmin (opcional)
```http
POST /tenants/with-admin
Authorization: Bearer <token-servus-admin>
Status: 201 Created
Headers: Location: /tenants/{tenantId}

Body:
{
  "tenantData": {
    "name": "Igreja Matriz",
    "description": "Igreja principal",
    "plan": "pro",
    "maxBranches": 5
  },
  "adminData": {  // OPCIONAL
    "name": "João Silva",
    "email": "joao@igreja.com",
    "password": "senha123"
  }
}
```

**Permissão:** Apenas ServusAdmin
**Resposta:** 201 com `{ tenant, admin?, membership? }` + header Location

### 🏪 **Módulo: Branches** (`/tenants/{tenantId}/branches`)

#### 2. Criar Branch + BranchAdmin (opcional)
```http
POST /tenants/{tenantId}/branches/with-admin
Authorization: Bearer <token-tenant-admin>
Status: 201 Created
Headers: Location: /tenants/{tenantId}/branches/{branchId}

Body:
{
  "branchData": {
    "name": "Filial Centro",
    "description": "Filial no centro da cidade",
    "telefone": "(11) 99999-9999"
  },
  "adminData": {  // OPCIONAL
    "name": "Maria Santos",
    "email": "maria@filial.com",
    "password": "senha123"
  }
}
```

**Permissão:** ServusAdmin ou TenantAdmin do tenant
**Restrições:** Valida cota do plano do tenant
**Resposta:** 201 com `{ branch, admin?, membership? }` + header Location

### 👤 **Módulo: Users** (`/users`)

O módulo Users agora possui **três fluxos bem definidos** para diferentes cenários de uso:

#### 🔐 **FLUXO 1: Criação Interna (ADMIN)**
Para quando administradores criam usuários diretamente no sistema:

##### 3. Criar Usuário com Membership (tenant scope)
```http
POST /users/tenants/{tenantId}/with-membership
Authorization: Bearer <token-admin>
Status: 201 Created
Headers: Location: /users/{userId}

Body:
{
  "userData": {
    "name": "Pedro Costa",
    "email": "pedro@igreja.com",
    "password": "senha123"
  },
  "membershipData": {
    "role": "leader",
    "branchId": "branch123", // opcional
    "ministryId": "ministry456" // opcional
  }
}
```

**Permissões:**
- **TenantAdmin**: Pode criar leader/volunteer; se enviar branchId, precisa ser do tenant
- **BranchAdmin**: Pode criar leader/volunteer apenas na própria branch
- **Leader**: Pode criar volunteer e (opcional) restringir ao ministryId da liderança

**Validação de Contexto:** Branch/ministry deve ser coerente com o criador
**Resposta:** 201 com `{ user, membership }` + header Location

##### 4. Criar Usuário na Branch Específica
```http
POST /users/tenants/{tenantId}/branches/{branchId}/with-membership
Authorization: Bearer <token-branch-admin>
Status: 201 Created
Headers: Location: /users/{userId}

Body:
{
  "userData": {
    "name": "Ana Oliveira",
    "email": "ana@filial.com",
    "password": "senha123"
  },
  "membershipData": {
    "role": "volunteer",
    "ministryId": "ministry789" // opcional
  }
}
```

**Permissão:** ServusAdmin, TenantAdmin, BranchAdmin ou Leader da branch
**Resposta:** 201 com `{ user, membership }` + header Location

#### 🔓 **FLUXO 2: Auto-Registro (VOLUNTÁRIO)**
Para quando voluntários se cadastram via link de convite:

##### 5. Auto-Registro via Link de Convite
```http
POST /users/self-register
Status: 201 Created
Headers: Location: /users/{userId}

Body:
{
  "email": "joao@email.com",
  "password": "minhasenha123",
  "name": "João Silva",
  "invitationToken": "uuid-do-convite",
  "phone": "(11) 99999-9999", // opcional
  "birthDate": "1990-01-01", // opcional
  "address": { // opcional
    "cep": "01234-567",
    "rua": "Rua das Flores",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP"
  }
}
```

**Características:**
- ✅ **Sem autenticação**: Qualquer pessoa com token válido pode usar
- ✅ **Role fixo**: Sempre cria como `volunteer`
- ✅ **Perfil básico**: Apenas dados essenciais inicialmente
- ✅ **Próximo passo**: Usuário deve completar perfil

**Resposta:** 201 com `{ user, message, nextStep }` + header Location

##### 6. Completar Perfil Após Auto-Registro
```http
POST /users/complete-profile/{userId}
Status: 200 OK

Body:
{
  "name": "João Silva",
  "phone": "(11) 99999-9999",
  "birthDate": "1990-01-01",
  "address": {
    "cep": "01234-567",
    "rua": "Rua das Flores",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP"
  },
  "bio": "Gosto de ajudar pessoas e servir na igreja",
  "skills": ["Música", "Organização", "Tecnologia"],
  "availability": "Fins de semana e noites"
}
```

**Características:**
- ✅ **Dados opcionais**: Usuário pode preencher o que quiser
- ✅ **Perfil completo**: Marca `profileCompleted: true`
- ✅ **Dados adicionais**: Bio, habilidades, disponibilidade

**Resposta:** 200 com `{ user, message }`

#### 🔍 **FLUXO 3: Listagem com Filtros por Role**
Para visualizar usuários baseado em permissões hierárquicas:

##### 7. Listar Usuários por Role no Tenant (TenantAdmin)
```http
GET /users/tenants/{tenantId}/by-role/{role}
Authorization: Bearer <token-tenant-admin>
Status: 200 OK

Query Parameters:
- page: número da página (padrão: 1)
- limit: itens por página (padrão: 20)
- search: busca por nome/email
- branchId: filtrar por branch específica

Example: /users/tenants/tenant123/by-role/leader?page=1&limit=10&search=Ana
```

**Permissões:** ServusAdmin ou TenantAdmin do tenant
**Resposta:** Lista paginada de usuários com role específico + estatísticas

##### 8. Listar Usuários por Role na Branch (BranchAdmin)
```http
GET /users/tenants/{tenantId}/branches/{branchId}/by-role/{role}
Authorization: Bearer <token-branch-admin>
Status: 200 OK

Query Parameters:
- page: número da página (padrão: 1)
- limit: itens por página (padrão: 20)
- search: busca por nome/email
- ministryId: filtrar por ministry específico

Example: /users/tenants/tenant123/branches/branch456/by-role/volunteer?page=1&limit=10
```

**Permissões:** ServusAdmin, TenantAdmin ou BranchAdmin da branch
**Resposta:** Lista paginada de usuários com role específico na branch

##### 9. Listar Voluntários por Ministry (Leader)
```http
GET /users/tenants/{tenantId}/ministries/{ministryId}/volunteers
Authorization: Bearer <token-leader>
Status: 200 OK

Query Parameters:
- page: número da página (padrão: 1)
- limit: itens por página (padrão: 20)
- search: busca por nome/email
- branchId: filtrar por branch específica

Example: /users/tenants/tenant123/ministries/jovens123/volunteers?page=1&limit=10
```

**Permissões:** ServusAdmin, TenantAdmin, BranchAdmin ou Leader do ministry
**Resposta:** Lista paginada de voluntários do ministry + dados de perfil

##### 10. Dashboard de Usuários por Tenant (TenantAdmin)
```http
GET /users/tenants/{tenantId}/dashboard
Authorization: Bearer <token-tenant-admin>
Status: 200 OK
```

**Resposta:**
```json
{
  "tenantId": "tenant123",
  "stats": {
    "byRole": [
      { "_id": "tenant_admin", "count": 2 },
      { "_id": "branch_admin", "count": 3 },
      { "_id": "leader", "count": 8 },
      { "_id": "volunteer", "count": 45 }
    ],
    "byBranch": [
      {
        "_id": "Matriz",
        "branchId": "branch123",
        "totalUsers": 25,
        "roles": ["tenant_admin", "leader", "volunteer"]
      }
    ],
    "totalUsers": 58
  },
  "recentUsers": [
    {
      "name": "João Silva",
      "email": "joao@igreja.com",
      "role": "volunteer",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

##### 11. Dashboard de Usuários por Branch (BranchAdmin)
```http
GET /users/tenants/{tenantId}/branches/{branchId}/dashboard
Authorization: Bearer <token-branch-admin>
Status: 200 OK
```

**Resposta:**
```json
{
  "tenantId": "tenant123",
  "branchId": "branch456",
  "stats": {
    "byRole": [
      { "_id": "branch_admin", "count": 1 },
      { "_id": "leader", "count": 3 },
      { "_id": "volunteer", "count": 18 }
    ],
    "byMinistry": [
      {
        "_id": "Jovens",
        "ministryId": "jovens123",
        "totalUsers": 12,
        "roles": ["leader", "volunteer"]
      }
    ],
    "totalUsers": 22
  },
  "recentUsers": [
    {
      "name": "Maria Santos",
      "email": "maria@filial.com",
      "role": "volunteer",
      "ministry": "jovens123",
      "createdAt": "2024-01-15T14:20:00Z"
    }
  ]
}
```

##### 12. Busca de Usuários por Nome/Email (Escopo Baseado na Role)
```http
GET /users/search?q={searchTerm}&page={page}&limit={limit}
Authorization: Bearer <token-user>
Status: 200 OK

Query Parameters:
- q: termo de busca (nome ou email)
- page: número da página (padrão: 1)
- limit: itens por página (padrão: 20)

Example: /users/search?q=Ana&page=1&limit=10
```

**Características:**
- ✅ **Escopo automático**: Cada usuário busca apenas no seu escopo
- ✅ **ServusAdmin**: Pode buscar em todo o sistema
- ✅ **Outros usuários**: Buscam apenas nos tenants onde têm membership
- ✅ **Busca inteligente**: Por nome ou email com regex case-insensitive

**Resposta:** Lista paginada de usuários encontrados + estatísticas de busca

#### 🔐 **FLUXO LEGADO: Criação Simples (ADMIN)**
Mantido para compatibilidade com código existente:

##### 13. Criação Simples de Usuário
```http
POST /users
Authorization: Bearer <token-admin>
Status: 201 Created

Body:
{
  "name": "Usuário Simples",
  "email": "usuario@igreja.com",
  "password": "senha123",
  "role": "volunteer"
}
```

**Permissões:** ServusAdmin, TenantAdmin, BranchAdmin ou Leader
**Resposta:** 201 com dados do usuário criado

## 📊 Estrutura de Resposta

### Criação de Tenant (sem admin)
```json
{
  "tenant": {
    "_id": "tenant123",
    "tenantId": "igreja001",
    "name": "Igreja Matriz",
    "isActive": true,
    "createdBy": "servus@admin.com"
  }
}
```

### Criação de Tenant + Admin
```json
{
  "tenant": {
    "_id": "tenant123",
    "tenantId": "igreja001",
    "name": "Igreja Matriz",
    "isActive": true,
    "createdBy": "servus@admin.com"
  },
  "admin": {
    "_id": "user123",
    "name": "João Silva",
    "email": "joao@igreja.com",
    "role": "volunteer"
  },
  "membership": {
    "_id": "membership123",
    "user": "user123",
    "tenant": "tenant123",
    "role": "tenant_admin",
    "isActive": true
  }
}
```

### Criação de Branch (sem admin)
```json
{
  "branch": {
    "_id": "branch123",
    "branchId": "igreja001-filial01",
    "name": "Filial Centro",
    "tenant": "tenant123",
    "isActive": true
  }
}
```

### Criação de Branch + Admin
```json
{
  "branch": {
    "_id": "branch123",
    "branchId": "igreja001-filial01",
    "name": "Filial Centro",
    "tenant": "tenant123",
    "isActive": true
  },
  "admin": {
    "_id": "user456",
    "name": "Maria Santos",
    "email": "maria@filial.com",
    "role": "volunteer"
  },
  "membership": {
    "_id": "membership456",
    "user": "user456",
    "tenant": "tenant123",
    "branch": "branch123",
    "role": "branch_admin",
    "isActive": true
  }
}
```

## 🔒 Validações de Segurança

### 1. **Validação de Permissões**
- ✅ Verificação de role global (ServusAdmin)
- ✅ Verificação de membership ativo no contexto
- ✅ Validação de hierarquia de roles
- ✅ Prevenção de escalada de privilégios

### 2. **Validação de Contexto**
- ✅ **Tenant**: Deve existir e estar ativo
- ✅ **Branch**: Deve pertencer ao tenant especificado
- ✅ **Ministry**: Deve pertencer ao tenant/branch especificado
- ✅ **Acesso**: Criador deve ter acesso ao contexto especificado

### 3. **Validação de Dados**
- ✅ **Email único**: Não pode existir usuário com mesmo email
- ✅ **Nomes únicos**: Tenant e branch com nomes únicos no escopo
- ✅ **Limites**: Respeita cota de branches do plano
- ✅ **Integridade**: Relacionamentos coerentes entre entidades

## 🔄 Transações e Consistência

### **Transações do Mongoose**
- ✅ **Atomicidade**: Todas as operações são atômicas
- ✅ **Consistência**: Dados sempre consistentes
- ✅ **Isolamento**: Operações isoladas entre si
- ✅ **Durabilidade**: Dados persistidos com segurança

### **Exemplo de Transação**
```typescript
// 1. Inicia sessão
const session = await this.tenantModel.startSession();
session.startTransaction();

try {
  // 2. Cria tenant
  const tenant = await new Tenant(data).save({ session });
  
  // 3. Se admin fornecido, cria usuário + membership
  if (adminData) {
    const admin = await new User(adminData).save({ session });
    const membership = await new Membership({
      user: admin._id,
      tenant: tenant._id,
      role: 'tenant_admin'
    }).save({ session });
  }
  
  // 4. Commit da transação
  await session.commitTransaction();
  
} catch (error) {
  // 5. Rollback em caso de erro
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

## 🔧 Como Usar no Frontend

### 1. Criar Igreja sem Admin
```typescript
const createChurchOnly = async (churchData) => {
  const response = await fetch('/tenants/with-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      tenantData: churchData
      // adminData omitido
    })
  });

  if (response.status === 201) {
    const result = await response.json();
    const location = response.headers.get('Location');
    
    console.log('Igreja criada:', result.tenant.name);
    console.log('Location:', location);
    
    return result;
  }
};
```

### 2. Criar Igreja com Admin
```typescript
const createChurchWithAdmin = async (churchData, adminData) => {
  const response = await fetch('/tenants/with-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      tenantData: churchData,
      adminData: adminData
    })
  });

  if (response.status === 201) {
    const result = await response.json();
    
    console.log('Igreja criada:', result.tenant.name);
    console.log('Admin criado:', result.admin.name);
    console.log('Membership:', result.membership.role);
    
    return result;
  }
};
```

### 3. Criar Filial sem Admin
```typescript
const createBranchOnly = async (tenantId, branchData) => {
  const response = await fetch(`/tenants/${tenantId}/branches/with-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      branchData: branchData
      // adminData omitido
    })
  });

  if (response.status === 201) {
    const result = await response.json();
    console.log('Filial criada:', result.branch.name);
    return result;
  }
};
```

### 4. Criar Usuário com Membership
```typescript
const createUserWithMembership = async (tenantId, userData, membershipData) => {
  const response = await fetch(`/users/tenants/${tenantId}/with-membership`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      userData: userData,
      membershipData: membershipData
    })
  });

  if (response.status === 201) {
    const result = await response.json();
    console.log('Usuário criado:', result.user.name);
    console.log('Membership:', result.membership.role);
    return result;
  }
};
```

## ⚠️ Validações e Regras

### 1. **Admin Opcional**
- ✅ **Tenant**: Pode ser criado sem admin inicial
- ✅ **Branch**: Pode ser criada sem admin inicial
- ✅ **Membership**: Só criado se admin fornecido
- ✅ **Flexibilidade**: Permite setup gradual da estrutura

### 2. **Validação de Cota**
- ✅ **Plano Basic**: Máximo 1 branch
- ✅ **Plano Pro**: Máximo 5 branches
- ✅ **Plano Enterprise**: Branches ilimitadas
- ✅ **Verificação**: Validação automática antes da criação

### 3. **Contexto Coerente**
- ✅ **Branch**: Deve pertencer ao tenant do criador
- ✅ **Ministry**: Deve pertencer ao tenant/branch do criador
- ✅ **Acesso**: Criador deve ter permissão no contexto
- ✅ **Isolamento**: Não pode criar fora do seu escopo

## 🏗️ Arquitetura e Organização

### **Organização por Módulos**
- 🏢 **Tenants**: Criação de igrejas + admins
- 🏪 **Branches**: Criação de filiais + admins
- 👤 **Users**: Criação de usuários + memberships

### **Benefícios da Nova Organização**
- ✅ **Separação de responsabilidades**: Cada módulo cuida do seu domínio
- ✅ **Manutenibilidade**: Código mais fácil de manter e evoluir
- ✅ **Escalabilidade**: Novos módulos podem ser adicionados facilmente
- ✅ **Padrão NestJS**: Segue as convenções do framework
- ✅ **Coesão**: Funcionalidades relacionadas ficam juntas

### **Estrutura de Arquivos**
```
src/modules/
├── tenants/
│   ├── controllers/tenants.controller.ts     # POST /tenants/with-admin
│   ├── services/tenants.service.ts          # createWithAdmin()
│   ├── DTO/create-tenant-with-admin.dto.ts  # DTO para tenant + admin
│   └── tenants.module.ts                    # Módulo com dependências
├── branches/
│   ├── controllers/branches.controller.ts    # POST /tenants/{id}/branches/with-admin
│   ├── services/branches.service.ts         # createWithAdmin()
│   ├── DTO/create-branch-with-admin.dto.ts  # DTO para branch + admin
│   └── branches.modules.ts                  # Módulo com dependências
└── users/
    ├── controllers/users.controller.ts       # POST /users/tenants/{id}/with-membership
    ├── services/users.service.ts            # createWithMembership()
    ├── DTO/create-user-with-membership.dto.ts # DTO para user + membership
    └── users.module.ts                      # Módulo com dependências
```

## 🧪 Exemplos de Casos de Uso

### Caso 1: Setup Gradual
```typescript
// 1. Criar igreja sem admin
const igreja = await createChurchOnly({
  name: "Igreja Batista",
  plan: "pro"
});

// 2. Mais tarde, adicionar admin
const admin = await createUserWithMembership(igreja.tenant._id, {
  name: "Pastor João",
  email: "joao@igreja.com",
  password: "senha123"
}, {
  role: "tenant_admin"
});
```

### Caso 2: Setup Completo
```typescript
// 1. Criar igreja com admin
const igreja = await createChurchWithAdmin({
  name: "Igreja Batista",
  plan: "pro"
}, {
  name: "Pastor João",
  email: "joao@igreja.com",
  password: "senha123"
});

// 2. Admin cria filial com admin
const filial = await createBranchWithAdmin(igreja.tenant._id, {
  name: "Filial Centro"
}, {
  name: "Pastor Pedro",
  email: "pedro@filial.com",
  password: "senha123"
});
```

### Caso 3: Validação de Contexto
```typescript
// BranchAdmin tenta criar usuário em outra branch
try {
  await createUserWithMembership(tenantId, {
    name: "Usuário",
    email: "user@example.com",
    password: "senha123"
  }, {
    role: "volunteer",
    branchId: "outra-branch-id" // ❌ Erro: sem acesso
  });
} catch (error) {
  console.log('Erro:', error.message); // "Sem acesso à branch especificada"
}
```

## 📝 Próximos Passos

1. **Validação de Ministry**
   - Implementar validação completa de ministry
   - Verificar se ministry pertence ao tenant/branch

2. **Endpoints de Listagem**
   - GET para listar tenants/branches/usuários
   - Filtros por contexto e permissões

3. **Edição e Desativação**
   - PUT para editar entidades
   - DELETE para desativar (soft delete)

4. **Transferência de Usuários**
   - Mover usuários entre branches
   - Alterar roles de membership

5. **Auditoria Avançada**
   - Logs detalhados de operações
   - Histórico de mudanças
   - Relatórios de permissões 