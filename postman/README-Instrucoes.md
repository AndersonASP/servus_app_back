# 📚 ServusApp API - Guia Completo de Testes

## 🚀 **COMO USAR ESTA COLLECTION**

### **1. Importar no Postman**
1. Abra o Postman
2. Clique em "Import"
3. Arraste o arquivo `ServusApp-API-Collection.json` ou clique em "Upload Files"
4. Selecione o arquivo e clique em "Import"

### **2. Configurar Variáveis**
Após importar, configure as variáveis:

```
VARIABLE NAME    | INITIAL VALUE    | CURRENT VALUE
base_url         | http://localhost:3000 | http://localhost:3000
x-tenant-id      | igreja001        | igreja001
access_token     | (deixar vazio)   | (será preenchido após login)
refresh_token    | (deixar vazio)   | (será preenchido após login)
```

---

## 🔐 **SEQUÊNCIA DE TESTES RECOMENDADA**

### **PASSO 1: Autenticação**
1. **Login** - Faça login como Super Admin
2. **Copie o `access_token`** para a variável `access_token`
3. **Copie o `refresh_token`** para a variável `refresh_token`

### **PASSO 2: Criação de Estrutura**
1. **Create Tenant with Admin** - Crie um novo tenant
2. **Create Branch with Admin** - Crie uma nova branch
3. **Create User with Membership** - Crie usuários com diferentes roles

### **PASSO 3: Testar Funcionalidades**
1. **List Users by Role** - Teste listagens por permissão
2. **Get Users Dashboard** - Teste dashboards
3. **Export Data** - Teste exportação CSV/Excel
4. **Notifications** - Teste sistema de notificações
5. **Metrics** - Teste métricas e engajamento
6. **Reports** - Teste geração de relatórios

---

## 🏢 **ENDPOINTS DE TENANT**

### **Create Tenant with Admin**
```http
POST {{base_url}}/tenants/with-admin
```
**Permissão:** Apenas `ServusAdmin`
**Payload:**
```json
{
  "tenantData": {
    "tenantId": "igreja002",
    "name": "Segunda Igreja",
    "description": "Nova igreja criada via API",
    "plan": "basic",
    "maxBranches": 3
  },
  "adminData": {
    "name": "Admin Segunda Igreja",
    "email": "admin@igreja2.com",
    "password": "123456"
  }
}
```

### **List Tenants**
```http
GET {{base_url}}/tenants
```
**Permissão:** Apenas `ServusAdmin`

---

## 🏗️ **ENDPOINTS DE BRANCH**

### **Create Branch with Admin**
```http
POST {{base_url}}/tenants/{{x-tenant-id}}/branches/with-admin
```
**Permissão:** `ServusAdmin` ou `TenantAdmin` do tenant específico
**Payload:**
```json
{
  "branchData": {
    "branchId": "{{x-tenant-id}}-filial03",
    "name": "Filial 03",
    "description": "Terceira filial criada via API"
  },
  "adminData": {
    "name": "Admin Filial 3",
    "email": "admin@filial3.com",
    "password": "123456"
  }
}
```

---

## 👥 **ENDPOINTS DE USUÁRIO**

### **Create User with Membership (Tenant Scope)**
```http
POST {{base_url}}/users/tenants/{{x-tenant-id}}/with-membership
```
**Permissão:** `TenantAdmin` ou `BranchAdmin`
**Payload:**
```json
{
  "userData": {
    "name": "Novo Líder Matriz",
    "email": "novo.lider@matriz.com",
    "password": "123456"
  },
  "membershipData": {
    "role": "leader",
    "ministryId": "louvor-matriz"
  }
}
```

### **Create User with Membership (Branch Scope)**
```http
POST {{base_url}}/users/tenants/{{x-tenant-id}}/branches/igreja001-filial01/with-membership
```
**Permissão:** `BranchAdmin` da branch específica

---

## 🔍 **ENDPOINTS DE LISTAGEM**

### **List Users by Role (Tenant)**
```http
GET {{base_url}}/users/tenants/{{x-tenant-id}}/by-role/leader
```
**Permissão:** `TenantAdmin` pode ver todos os líderes do tenant

### **List Users by Role (Branch)**
```http
GET {{base_url}}/users/tenants/{{x-tenant-id}}/branches/igreja001-filial01/by-role/volunteer
```
**Permissão:** `BranchAdmin` pode ver voluntários da sua branch

### **Get Users Dashboard**
```http
GET {{base_url}}/users/tenants/{{x-tenant-id}}/dashboard
```
**Permissão:** `TenantAdmin` ou `BranchAdmin`

---

## 📤 **ENDPOINTS DE EXPORTAÇÃO**

### **Export Users by Role (CSV)**
```http
GET {{base_url}}/users/tenants/{{x-tenant-id}}/by-role/volunteer/export?format=csv
```

### **Export Dashboard (Excel)**
```http
GET {{base_url}}/users/tenants/{{x-tenant-id}}/dashboard/export?format=excel
```

---

## 🔔 **ENDPOINTS DE NOTIFICAÇÕES**

### **List Notifications**
```http
GET {{base_url}}/notifications
```

### **Get Notification Stats**
```http
GET {{base_url}}/notifications/stats
```

---

## 📊 **ENDPOINTS DE MÉTRICAS**

### **Record User Activity**
```http
POST {{base_url}}/metrics/activity
```

### **Get User Engagement**
```http
GET {{base_url}}/metrics/users/{{x-tenant-id}}/engagement
```

---

## 📈 **ENDPOINTS DE RELATÓRIOS**

### **Generate Users Report**
```http
POST {{base_url}}/reports/generate
```
**Payload:**
```json
{
  "type": "users",
  "filters": {
    "tenantId": "{{x-tenant-id}}",
    "roles": ["volunteer", "leader"]
  },
  "groupBy": "branch",
  "metrics": ["count", "profile_completeness"]
}
```

---

## ⚠️ **IMPORTANTE - PERMISSÕES**

### **Hierarquia de Criação:**
- **`ServusAdmin`** → Pode criar Tenants e TenantAdmins
- **`TenantAdmin`** → Pode criar Branches, BranchAdmins e Leaders
- **`BranchAdmin`** → Pode criar Leaders e Volunteers (dentro da sua branch)
- **`Leader`** → Pode criar Volunteers (dentro do seu ministério)

### **Escopo de Visualização:**
- **`TenantAdmin`** → Vê todos os usuários do tenant
- **`BranchAdmin`** → Vê usuários da sua branch
- **`Leader`** → Vê voluntários do seu ministério

---

## 🧪 **TESTES RECOMENDADOS**

### **1. Teste de Hierarquia**
1. Login como Super Admin
2. Criar novo tenant
3. Criar nova branch
4. Criar usuários com diferentes roles
5. Verificar permissões

### **2. Teste de RBAC**
1. Login como diferentes roles
2. Tentar acessar endpoints não autorizados
3. Verificar listagens por escopo

### **3. Teste de Funcionalidades**
1. Dashboards e métricas
2. Exportação de dados
3. Sistema de notificações
4. Geração de relatórios

---

## 🔧 **TROUBLESHOOTING**

### **Erro 401 Unauthorized**
- Verifique se o `access_token` está configurado
- Verifique se o token não expirou
- Use o endpoint de refresh se necessário

### **Erro 403 Forbidden**
- Verifique se o usuário tem permissão para o endpoint
- Verifique se está no tenant correto
- Verifique se o `x-tenant-id` está configurado

### **Erro 404 Not Found**
- Verifique se o `base_url` está correto
- Verifique se o servidor está rodando
- Verifique se os IDs nas URLs estão corretos

---

## 📝 **NOTAS ADICIONAIS**

- **Cache:** Dashboards usam Redis para performance
- **Exportação:** Suporta CSV e Excel
- **Notificações:** Sistema em tempo real
- **Métricas:** Tracking automático de atividades
- **Relatórios:** Personalizáveis e agendáveis

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Importe a collection** no Postman
2. **Configure as variáveis** conforme instruído
3. **Execute os testes** na sequência recomendada
4. **Verifique as permissões** e hierarquia
5. **Teste todas as funcionalidades** implementadas

**Boa sorte com os testes! 🚀** 