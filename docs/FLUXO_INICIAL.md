# 🚀 Fluxo Inicial Completo - ServusApp

Este documento descreve o fluxo completo para iniciar o sistema ServusApp do zero.

## 📋 **Pré-requisitos**

- ✅ Backend rodando (`npm run start:dev`)
- ✅ Base de dados MongoDB conectada
- ✅ Dependências instaladas (`npm install`)

## 🧹 **Passo 1: Limpar Base de Dados**

```bash
# Limpa completamente a base de dados
npm run db:clear
```

**O que acontece:**
- Remove todas as coleções existentes
- Mantém apenas coleções do sistema MongoDB
- Prepara o sistema para começar do zero

## 🌱 **Passo 2: Criar Dados Iniciais**

```bash
# Cria o ServusAdmin com tenant e membership básicos
npm run db:seed
```

**O que é criado:**
- 👑 **ServusAdmin**: `admin@servus.com` / `admin123`
- 🎯 **Role Global**: ServusAdmin (acesso total ao sistema)
- 🌍 **Acesso**: Global a todos os tenants (sem membership)

**O que NÃO é criado (você fará pelo app):**
- 🏢 Novos tenants para igrejas
- 🏛️ Branches
- 🎵 Ministérios

## 🔄 **Passo 3: Reset Completo (Opcional)**

```bash
# Executa limpeza + seed em sequência
npm run db:reset
```

## 🔐 **Passo 4: Login Inicial**

### **4.1. Login do ServusAdmin**
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "admin@servus.com",
  "password": "admin123"
}
```

**Resposta esperada:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "...",
    "email": "admin@servus.com",
    "name": "Servus Admin"
  }
}
```

**Nota:** Como o ServusAdmin tem acesso global, ele pode acessar qualquer tenant sem precisar de membership específico.

### **4.2. Usar o Token**
```bash
# Adicionar em todas as requisições subsequentes
Authorization: Bearer SEU_ACCESS_TOKEN

# Nota: x-tenant-id só será necessário após criar um tenant
```

## 🏗️ **Passo 5: Fluxo Completo pelo App**

### **5.1. Criar Tenant**
Após fazer login como ServusAdmin, use o app para:
- Criar um tenant (ex: igreja001)
- Configurar dados básicos da igreja

### **5.2. Criar Branch (Opcional)**
- Criar branches/filiais se necessário
- Configurar hierarquia organizacional

### **5.3. Criar Ministérios**
- Criar ministérios através do app
- Configurar permissões e responsabilidades



## 📊 **Estrutura Inicial**

```
👑 ServusAdmin (admin@servus.com)
├── 🎯 Role Global: ServusAdmin (acesso total)
├── 🌍 Acesso: Global a todos os tenants
└── 💡 Próximo: Criar novos tenants pelo app
```

## 📊 **Estrutura Final (após usar o app)**

```
👑 ServusAdmin (admin@servus.com)
├── 🏢 Tenant: [criado pelo app]
│   ├── 🏛️ Branch: [criada pelo app]
│   │   └── 🎵 Ministérios: [criados pelo app]
│   └── 🔗 Role: [configurado pelo app]
```

## 🔍 **Endpoints de Debug Disponíveis**

**Nota:** Estes endpoints só funcionarão após criar um tenant pelo app.

### **Matriz (sem branch)**
- `GET /tenants/:tenantId/ministries/debug-auth`
- `POST /tenants/:tenantId/ministries/debug-create`
- `POST /tenants/:tenantId/ministries/debug-create-no-perm`

### **Filiais (com branch)**
- `GET /tenants/:tenantId/branches/:branchId/ministries/debug-auth`
- `POST /tenants/:tenantId/branches/:branchId/ministries/debug-create`
- `POST /tenants/:tenantId/branches/:branchId/ministries/debug-create-no-perm`

## 🚨 **Troubleshooting**

### **Erro 401 (Não Autorizado)**
- Verificar se o token está sendo enviado
- Verificar se o token não expirou
- Verificar se o `x-tenant-id` está correto

### **Erro 403 (Proibido)**
- Verificar se o usuário tem permissões
- Verificar se o membership está ativo
- Verificar se o tenant/branch estão corretos

### **Erro de Conexão MongoDB**
- Verificar variáveis de ambiente
- Verificar se o MongoDB está rodando
- Verificar configurações de SSL

## 📝 **Próximos Passos**

Após criar o ministério inicial, você pode:

1. **Criar mais ministérios**
2. **Criar branches (filiais)**
3. **Adicionar usuários e membros**
4. **Configurar eventos e escalas**
5. **Implementar funcionalidades específicas**

## 🎯 **Resumo dos Comandos**

```bash
# 1. Limpar base
npm run db:clear

# 2. Criar dados iniciais
npm run db:seed

# 3. Reset completo (opcional)
npm run db:reset

# 4. Iniciar servidor
npm run start:dev
```

---

**🎉 Agora você tem um sistema limpo e funcional para começar o desenvolvimento!**
