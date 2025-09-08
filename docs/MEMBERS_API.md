# API de Membros - Documentação

## Visão Geral

A API de Membros permite criar, gerenciar e consultar membros do sistema com vínculos organizacionais. A funcionalidade principal é a criação atômica de membros com múltiplos vínculos organizacionais em uma única operação transacional.

## Características Principais

- ✅ **Operação Atômica**: Criação de usuário e vínculos em uma única transação
- ✅ **Idempotência**: Upsert de memberships para evitar duplicatas
- ✅ **Validações de Escopo**: Regras rigorosas por role e contexto
- ✅ **RBAC**: Controle de acesso baseado em roles
- ✅ **Auditoria**: Rastreamento de createdBy/updatedBy

## Endpoints

### POST /members

Cria um novo membro com vínculos organizacionais.

#### Request Body

```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11999999999",
  "birthDate": "1990-01-01",
  "bio": "Desenvolvedor experiente",
  "skills": ["JavaScript", "Node.js"],
  "availability": "Segunda a Sexta",
  "address": {
    "cep": "01234-567",
    "rua": "Rua das Flores",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP"
  },
  "memberships": [
    {
      "role": "volunteer",
      "branchId": "branch123",
      "ministryId": "ministry456",
      "isActive": true
    }
  ],
  "password": "senha123"
}
```

#### Response (201 Created)

```json
{
  "id": "user123",
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11999999999",
  "isActive": true,
  "memberships": [
    {
      "id": "membership123",
      "role": "volunteer",
      "isActive": true,
      "branch": {
        "id": "branch123",
        "name": "Filial Centro"
      },
      "ministry": {
        "id": "ministry456",
        "name": "Ministério de Música"
      },
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:00Z"
}
```

## Regras de Negócio

### Validações Obrigatórias

1. **Nome**: Obrigatório e não pode estar vazio
2. **Contato**: Pelo menos um de email ou telefone deve ser fornecido
3. **Vínculos**: Pelo menos um membership é obrigatório
4. **Unicidade**: Email/telefone deve ser único por tenant

### Regras por Role

#### tenant_admin
- ✅ Pode criar qualquer role dentro do tenant
- ✅ Não pode ter branchId ou ministryId nos vínculos

#### branch_admin
- ✅ Pode criar: branch_admin, leader, volunteer
- ✅ Só pode operar na própria branch
- ✅ Ministries devem pertencer à branch

#### leader
- ✅ Pode criar: volunteer
- ✅ Só pode operar no próprio ministry
- ✅ Branch e ministry são inferidos do contexto

### Validações de Escopo

- **volunteer/leader**: Exigem ministryId
- **branch_admin**: Exige branchId
- **tenant_admin**: Não aceita branchId/ministryId

## Códigos de Resposta

| Código | Descrição |
|--------|-----------|
| 201 | Membro criado com sucesso |
| 400 | Dados inválidos ou validação falhou |
| 401 | Token de autenticação inválido |
| 403 | Usuário não tem permissão |
| 404 | Branch/Ministry não encontrado |
| 409 | Email/telefone já está em uso |
| 500 | Erro interno do servidor |

## Exemplos de Uso

### Criar Voluntário

```bash
curl -X POST http://localhost:3000/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Santos",
    "email": "maria@example.com",
    "memberships": [
      {
        "role": "volunteer",
        "ministryId": "ministry123",
        "isActive": true
      }
    ]
  }'
```

### Criar Líder com Múltiplos Vínculos

```bash
curl -X POST http://localhost:3000/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pedro Oliveira",
    "email": "pedro@example.com",
    "phone": "11988888888",
    "memberships": [
      {
        "role": "leader",
        "branchId": "branch123",
        "ministryId": "ministry456",
        "isActive": true
      },
      {
        "role": "volunteer",
        "ministryId": "ministry789",
        "isActive": true
      }
    ]
  }'
```

## Testes

### Executar Testes Unitários

```bash
npm run test members.service.spec.ts
```

### Executar Testes de Integração

```bash
npm run test:e2e members.e2e-spec.ts
```

## Segurança

- ✅ Autenticação JWT obrigatória
- ✅ Validação de permissões por role
- ✅ Sanitização de dados de entrada
- ✅ Transações atômicas para consistência
- ✅ Auditoria de operações

## Observabilidade

- ✅ Logs estruturados para operações
- ✅ Métricas de criação de membros
- ✅ Rastreamento de erros e exceções
- ✅ Monitoramento de performance

## Limitações

- Máximo de 10 vínculos por membro
- Validação de escopo rigorosa
- Operação síncrona (não suporta processamento assíncrono)
- Dependência de conectividade com MongoDB
