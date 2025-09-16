# 🔧 Correção de Variáveis de Ambiente no Beanstalk

## 🎯 Problema Identificado

O app estava tentando carregar variáveis de ambiente de um arquivo `.env` em vez de usar as variáveis de ambiente do sistema (que é o que o Beanstalk fornece).

## ✅ Soluções Implementadas

### 1. **Correção no `dotenv.config.ts`**

```typescript
// ✅ Agora em produção não carrega arquivo .env
if (nodeEnv === 'production') {
  console.log('🌍 Ambiente: PRODUÇÃO - Usando apenas variáveis de ambiente do sistema');
  return;
}
```

### 2. **Configuração do Beanstalk (`.ebextensions/`)**

#### `01-environment.config`
```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm run start:beanstalk"
    NodeVersion: 18.19.0
```

#### `02-server.config`
```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    ProxyServer: nginx
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health
    Port: '8080'
    Protocol: HTTP
```

#### `03-logs.config`
```yaml
option_settings:
  aws:elasticbeanstalk:cloudwatch:logs:
    StreamLogs: true
    DeleteOnTerminate: false
    RetentionInDays: 7
```

### 3. **Script de Deploy Automatizado**

```bash
# Usar o script de deploy
./deploy-beanstalk.sh servus-backend-prod
```

## 🚀 Como Fazer Deploy

### Opção 1: Script Automatizado
```bash
# Tornar executável (se necessário)
chmod +x deploy-beanstalk.sh

# Fazer deploy
./deploy-beanstalk.sh servus-backend-prod
```

### Opção 2: Comandos Manuais
```bash
# Build
npm run build

# Deploy
eb deploy servus-backend-prod

# Verificar status
eb status servus-backend-prod
```

## 🔍 Verificação das Variáveis

### No Beanstalk Console:
1. Acesse: https://console.aws.amazon.com/elasticbeanstalk
2. Selecione sua aplicação
3. Vá em **Configuration > Software**
4. Verifique se as variáveis estão configuradas:

```
NODE_ENV=production
PORT=8080
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
```

### Via EB CLI:
```bash
# Ver variáveis de ambiente
eb printenv servus-backend-prod

# Ver logs
eb logs servus-backend-prod --all
```

## 🎯 Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente | `production` |
| `PORT` | Porta do servidor | `8080` |
| `MONGO_URI` | String de conexão MongoDB | `mongodb+srv://...` |
| `JWT_ACCESS_SECRET` | Chave secreta JWT | `sua-chave-secreta` |
| `JWT_REFRESH_SECRET` | Chave secreta refresh | `sua-chave-refresh` |

## 🔧 Troubleshooting

### Problema: "Arquivo .env não encontrado"
**Solução**: ✅ Corrigido - agora em produção não tenta carregar arquivo .env

### Problema: "NODE_ENV não definido"
**Solução**: ✅ Corrigido - `.ebextensions/01-environment.config` define `NODE_ENV=production`

### Problema: "Porta incorreta"
**Solução**: ✅ Corrigido - `.ebextensions/02-server.config` define `Port: '8080'`

### Problema: "Health check falha"
**Solução**: ✅ Corrigido - configuração de health check em `/health`

## 📊 Logs Importantes

### Verificar se está em produção:
```bash
eb logs servus-backend-prod --all | grep "Ambiente: PRODUÇÃO"
```

### Verificar se não está carregando .env:
```bash
eb logs servus-backend-prod --all | grep "Não carregando arquivo .env"
```

### Verificar se variáveis estão presentes:
```bash
eb logs servus-backend-prod --all | grep "Todas as variáveis obrigatórias estão presentes"
```

## ✅ Checklist de Deploy

- [ ] ✅ `dotenv.config.ts` corrigido para produção
- [ ] ✅ `.ebextensions/` configurado
- [ ] ✅ `.ebignore` criado
- [ ] ✅ Script de deploy criado
- [ ] ✅ Variáveis de ambiente configuradas no Beanstalk
- [ ] ✅ Deploy executado
- [ ] ✅ Health check funcionando
- [ ] ✅ Logs verificados

## 🎉 Resultado Esperado

Após o deploy, você deve ver nos logs:

```
🌍 Ambiente: PRODUÇÃO - Usando apenas variáveis de ambiente do sistema
📁 Não carregando arquivo .env em produção
✅ Todas as variáveis obrigatórias estão presentes.
```

**Não mais erros de arquivo .env não encontrado!** 🚀
