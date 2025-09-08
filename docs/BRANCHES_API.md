# API de Gerenciamento de Filiais (Branches)

## Visão Geral

O módulo de branches permite o gerenciamento completo de filiais (branches) dentro de um tenant. Apenas usuários com role `tenant_admin` podem criar, editar, desativar ou remover filiais.

## Funcionalidades

### ✅ Controle de Acesso
- **Apenas `tenant_admin`** pode gerenciar filiais
- Validação automática de permissões via JWT
- Verificação de escopo de tenant

### ✅ Validação de Plano
- Respeita o limite de filiais do plano do tenant
- Plano `basic`: 1 filial
- Plano `pro`: 5 filiais  
- Plano `enterprise`: ilimitado (-1)
- Validação automática antes da criação

### ✅ CRUD Completo
- **Criar** filial com dados completos
- **Listar** filiais com filtros e paginação
- **Visualizar** detalhes de uma filial
- **Atualizar** dados da filial
- **Desativar** filial (soft delete)
- **Remover** filial permanentemente

## Endpoints

### 1. Criar Filial
```http
POST /tenants/{tenantId}/branches
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Filial Centro",
  "description": "Filial localizada no centro da cidade",
  "endereco": {
    "cep": "12345-678",
    "rua": "Rua das Flores",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP"
  },
  "telefone": "(11) 99999-9999",
  "email": "centro@igreja.com",
  "diasCulto": [
    {
      "dia": "domingo",
      "horarios": ["09:00", "19:30"]
    }
  ]
}
```

**Resposta:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "branchId": "igreja001-filial-centro-1703123456789",
  "name": "Filial Centro",
  "description": "Filial localizada no centro da cidade",
  "endereco": { ... },
  "isActive": true,
  "createdAt": "2023-12-21T10:30:00.000Z",
  "updatedAt": "2023-12-21T10:30:00.000Z"
}
```

### 2. Criar Filial com Administrador
```http
POST /tenants/{tenantId}/branches/with-admin
Authorization: Bearer {token}
Content-Type: application/json

{
  "branchData": {
    "name": "Filial Norte",
    "description": "Filial da região norte"
  },
  "adminData": {
    "name": "João Silva",
    "email": "joao@igreja.com",
    "password": "senha123"
  }
}
```

### 3. Listar Filiais
```http
GET /tenants/{tenantId}/branches?search=centro&page=1&limit=10&sortBy=name&sortOrder=asc
Authorization: Bearer {token}
```

**Parâmetros de Query:**
- `search`: Busca por nome ou descrição
- `cidade`: Filtrar por cidade
- `estado`: Filtrar por estado
- `isActive`: Filtrar por status (true/false)
- `page`: Página (padrão: 1)
- `limit`: Itens por página (padrão: 10)
- `sortBy`: Campo para ordenação (padrão: name)
- `sortOrder`: Ordem (asc/desc, padrão: asc)

**Resposta:**
```json
{
  "branches": [
    {
      "id": "507f1f77bcf86cd799439011",
      "branchId": "igreja001-filial-centro-1703123456789",
      "name": "Filial Centro",
      "isActive": true,
      "createdAt": "2023-12-21T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 4. Obter Detalhes da Filial
```http
GET /tenants/{tenantId}/branches/{branchId}
Authorization: Bearer {token}
```

### 5. Atualizar Filial
```http
PUT /tenants/{tenantId}/branches/{branchId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Filial Centro Atualizada",
  "telefone": "(11) 88888-8888",
  "isActive": true
}
```

### 6. Desativar Filial
```http
DELETE /tenants/{tenantId}/branches/{branchId}
Authorization: Bearer {token}
```

### 7. Remover Filial Permanentemente
```http
DELETE /tenants/{tenantId}/branches/{branchId}/permanent
Authorization: Bearer {token}
```

## Validações

### Limite de Filiais por Plano
- **Basic**: 1 filial
- **Pro**: 5 filiais
- **Enterprise**: Ilimitado

### Validações de Dados
- Nome da filial é obrigatório
- Nome deve ser único dentro do tenant
- Email deve ter formato válido (se fornecido)
- Telefone deve ter formato válido (se fornecido)

### Validações de Negócio
- Não é possível remover filial com membros ativos
- Filial é automaticamente vinculada ao tenant principal
- BranchId é gerado automaticamente se não fornecido

## Códigos de Erro

### 400 - Bad Request
```json
{
  "message": "Limite máximo de 1 filiais atingido para o plano basic.",
  "error": "Conflict",
  "statusCode": 400
}
```

### 403 - Forbidden
```json
{
  "message": "Acesso negado ao tenant especificado",
  "error": "Forbidden",
  "statusCode": 403
}
```

### 404 - Not Found
```json
{
  "message": "Filial não encontrada.",
  "error": "Not Found",
  "statusCode": 404
}
```

### 409 - Conflict
```json
{
  "message": "Já existe uma filial com o nome \"Filial Centro\" neste tenant.",
  "error": "Conflict",
  "statusCode": 409
}
```

## Estrutura de Dados

### Branch Schema
```typescript
{
  branchId: string;           // ID único da filial
  name: string;              // Nome da filial
  description?: string;      // Descrição
  endereco?: {               // Endereço completo
    cep?: string;
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    complemento?: string;
  };
  telefone?: string;         // Telefone
  email?: string;           // Email
  whatsappOficial?: string; // WhatsApp oficial
  diasCulto?: {             // Dias de culto
    dia: string;
    horarios: string[];
  }[];
  eventosPadrao?: {         // Eventos padrão
    nome: string;
    dia: string;
    horarios: string[];
    tipo?: string;
  }[];
  modulosAtivos?: string[]; // Módulos ativos
  logoUrl?: string;         // URL do logo
  corTema?: string;         // Cor do tema
  idioma?: string;          // Idioma (padrão: pt-BR)
  timezone?: string;        // Fuso horário
  tenant: ObjectId;         // Referência ao tenant
  isActive: boolean;        // Status ativo/inativo
  createdBy?: string;       // Quem criou
  createdAt: Date;          // Data de criação
  updatedAt: Date;          // Data de atualização
}
```

## Exemplos de Uso

### Criar Primeira Filial
```bash
curl -X POST "http://localhost:3000/tenants/igreja001/branches" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Filial Matriz",
    "description": "Igreja matriz",
    "endereco": {
      "cidade": "São Paulo",
      "estado": "SP"
    }
  }'
```

### Listar Filiais com Filtro
```bash
curl -X GET "http://localhost:3000/tenants/igreja001/branches?search=centro&isActive=true" \
  -H "Authorization: Bearer {token}"
```

### Atualizar Filial
```bash
curl -X PUT "http://localhost:3000/tenants/igreja001/branches/filial-centro-123" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "(11) 99999-9999",
    "email": "contato@filial.com"
  }'
```

## Notas Importantes

1. **Autenticação**: Todos os endpoints requerem token JWT válido
2. **Autorização**: Apenas `tenant_admin` pode gerenciar filiais
3. **Limite de Plano**: Respeitado automaticamente
4. **Vinculação**: Filiais são automaticamente vinculadas ao tenant principal
5. **Soft Delete**: Desativação não remove dados, apenas marca como inativo
6. **Validação**: Nomes de filiais devem ser únicos dentro do tenant
