# Sistema de Feedback do Servus

## 📋 Visão Geral

O sistema de feedback do Servus foi implementado para fornecer mensagens de sucesso, erro, aviso e informação em tempo real para os usuários. O sistema está integrado com a criação de tenants e pode ser facilmente expandido para outras operações.

## 🏗️ Arquitetura

### Componentes Principais

1. **FeedbackService** - Serviço principal para criar e gerenciar feedbacks
2. **FeedbackController** - API REST para acessar feedbacks do usuário
3. **Integração com TenantService** - Feedback automático na criação de tenants

### Tipos de Feedback

- **Success** ✅ - Operações bem-sucedidas
- **Error** ❌ - Erros e falhas
- **Warning** ⚠️ - Avisos importantes
- **Info** ℹ️ - Informações gerais

## 🚀 Como Usar

### 1. Criar Feedback Manual

```typescript
// No seu service
constructor(private feedbackService: FeedbackService) {}

// Feedback de sucesso
await this.feedbackService.createSuccessFeedback(
  userId,
  'Operação Concluída',
  'A operação foi realizada com sucesso',
  tenantId,
  branchId,
  ministryId,
  '/dashboard', // URL de ação
  { operationId: '123' } // metadados
);

// Feedback de erro
await this.feedbackService.createErrorFeedback(
  userId,
  'Erro na Operação',
  'Não foi possível completar a operação',
  tenantId
);
```

### 2. Métodos Específicos para CRUD

```typescript
// Para criação de tenants
await this.feedbackService.createTenantSuccess(
  userId,
  'Igreja Nova Esperança',
  tenantId,
  true // admin foi criado
);

// Para criação de usuários
await this.feedbackService.createUserSuccess(
  userId,
  'João Silva',
  tenantId,
  'tenant_admin'
);
```

### 3. Acessar Feedbacks via API

```bash
# Obter feedbacks do usuário
GET /feedback?tenantId=123&limit=20

# Marcar feedback como lido
POST /feedback/feedback_123/read

# Obter estatísticas
GET /feedback/stats
```

## 📊 Integração com Criação de Tenants

### Cenários Cobertos

1. **Sucesso na Criação**
   - Tenant criado com sucesso
   - Admin criado (se aplicável)
   - Email enviado (se aplicável)

2. **Erros Comuns**
   - Nome de tenant já existe
   - Email de admin já cadastrado
   - Permissão insuficiente
   - Erro interno do servidor

3. **Avisos**
   - Tenant criado mas email não enviado
   - Problemas de conectividade

### Exemplo de Feedback Gerado

```json
{
  "id": "feedback_1703123456789_abc123",
  "type": "success",
  "title": "Tenant Criado com Sucesso!",
  "message": "A igreja \"Nova Esperança\" foi criada com sucesso e o administrador foi configurado.",
  "userId": "user_123",
  "tenantId": "tenant_456",
  "createdAt": "2023-12-21T10:30:00Z",
  "actionUrl": "/tenants/tenant_456",
  "metadata": {
    "tenantName": "Nova Esperança",
    "adminCreated": true
  }
}
```

## 🔧 Configuração

### 1. Importar o Módulo

```typescript
// No seu module
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  // ...
})
export class YourModule {}
```

### 2. Injetar o Serviço

```typescript
constructor(
  private feedbackService: FeedbackService
) {}
```

## 📱 Integração Frontend

### 1. Obter Feedbacks

```dart
// Flutter
final response = await http.get(
  Uri.parse('$baseUrl/feedback?tenantId=$tenantId'),
  headers: {'Authorization': 'Bearer $token'},
);

final feedbacks = (json.decode(response.body) as List)
    .map((f) => Feedback.fromJson(f))
    .toList();
```

### 2. Exibir com ServusSnackbar

```dart
// Usar o FeedbackService existente
FeedbackService.showSuccess(context, feedback.message);
FeedbackService.showError(context, feedback.message);
```

## 🎯 Próximos Passos

### Melhorias Futuras

1. **WebSocket Integration** - Notificações em tempo real
2. **Persistência** - Salvar feedbacks no MongoDB
3. **Templates** - Templates pré-definidos para feedbacks
4. **Analytics** - Métricas de uso do sistema
5. **Bulk Operations** - Operações em lote

### Expansão para Outros Módulos

```typescript
// Exemplo para Users
await this.feedbackService.createUserSuccess(userId, userName, tenantId, role);

// Exemplo para Ministries
await this.feedbackService.createSuccessFeedback(
  userId,
  'Ministério Criado',
  `O ministério "${ministryName}" foi criado com sucesso`,
  tenantId,
  branchId,
  ministryId
);
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Feedback não aparece**
   - Verificar se o userId está correto
   - Confirmar se o módulo está importado

2. **Erro de dependência**
   - Verificar se FeedbackService está no providers
   - Confirmar imports do módulo

3. **Performance**
   - Usar limite nos queries
   - Implementar cleanup de feedbacks antigos

## 📝 Logs

O sistema gera logs detalhados:

```
✅ [FeedbackService] Feedback de sucesso criado: Tenant Criado com Sucesso!
❌ [FeedbackService] Feedback de erro criado: Erro ao Criar Tenant
⚠️ [FeedbackService] Feedback de aviso criado: Email Não Enviado
ℹ️ [FeedbackService] Feedback informativo criado: Email Enviado
```

## 🔒 Segurança

- Feedbacks são isolados por usuário
- Apenas o usuário pode ver seus próprios feedbacks
- Validação de permissões nos endpoints
- Sanitização de dados de entrada
