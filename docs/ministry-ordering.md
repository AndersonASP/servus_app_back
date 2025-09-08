# Ordenação de Ministérios

## Funcionalidade Implementada

Quando um ministério é inativado, ele agora aparece no **final da listagem** ao invés de desaparecer completamente.

## Como Funciona

### Ordenação Atual
A listagem de ministérios agora segue esta ordem:

1. **Ministérios Ativos** (primeiro)
   - Ordenados por data de criação (mais recentes primeiro)
2. **Ministérios Inativos** (depois)
   - Ordenados por data de criação (mais recentes primeiro)

### Filtro Padrão Atualizado
- **Antes**: Mostrava apenas ministérios ativos por padrão
- **Agora**: Mostra **todos** os ministérios (ativos e inativos) por padrão

### Implementação Técnica

No arquivo `src/modules/ministries/ministries.service.ts`, o método `list()` foi modificado:

```typescript
.sort({ 
  isActive: -1, // Ativos primeiro (true = 1, false = 0, então -1 coloca true primeiro)
  createdAt: -1 // Dentro de cada grupo, mais recentes primeiro
})
```

### Exemplo de Resultado

```
1. Ministério de Música - ✅ ATIVO (Criado em: 15/01/2024)
2. Ministério de Jovens - ✅ ATIVO (Criado em: 10/01/2024)
3. Ministério de Crianças - ✅ ATIVO (Criado em: 05/01/2024)
4. Ministério de Louvor - ❌ INATIVO (Criado em: 20/01/2024)
5. Ministério de Evangelismo - ❌ INATIVO (Criado em: 12/01/2024)
```

## Mudanças no Frontend

### Controllers Atualizados

1. **MinisterioListController** (`servus_app/lib/features/leader/ministerios/controllers/ministerios_lista_controller.dart`)
   - `showOnlyActive = false` (era `true`)
   - `filterStatus = 'todos'` (era `'ativos'`)

2. **MinistryController** (`servus_app/lib/core/auth/controllers/ministry_controller.dart`)
   - `_showOnlyActive = false` (era `true`)
   - Métodos `clearFilters()` e `reset()` também atualizados

## Benefícios

1. **Visibilidade**: Ministérios inativos não desaparecem, facilitando a reativação
2. **Histórico**: Mantém o histórico completo dos ministérios
3. **Organização**: Separação clara entre ativos e inativos
4. **Usabilidade**: Facilita a gestão e tomada de decisões
5. **Padrão Melhorado**: Mostra todos os ministérios por padrão, dando visibilidade completa

## Teste

Para testar a funcionalidade, execute:

```bash
npm run test:ministry-order
```

Para debug detalhado:

```bash
npm run debug:ministry-order
```

## Compatibilidade

- ✅ Funciona para ministérios da matriz (sem branchId)
- ✅ Funciona para ministérios de filiais (com branchId)
- ✅ Mantém compatibilidade com filtros existentes
- ✅ Não quebra funcionalidades existentes
- ✅ Aceita tanto string quanto boolean para o parâmetro isActive
