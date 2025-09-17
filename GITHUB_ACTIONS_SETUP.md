# 🚀 Configuração GitHub Actions para Deploy no Beanstalk

## 📋 Pré-requisitos

1. **Conta AWS** com permissões para Elastic Beanstalk
2. **Repositório GitHub** configurado
3. **Secrets configurados** no GitHub

## 🔐 Configuração dos Secrets

### 1. Acessar Configurações do Repositório
1. Vá para: `https://github.com/AndersonASP/servus_app_back`
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Secrets and variables** → **Actions**

### 2. Adicionar Secrets Necessários

Clique em **New repository secret** e adicione:

#### **AWS_ACCESS_KEY_ID**
```
AKIA... (sua chave de acesso AWS)
```

#### **AWS_SECRET_ACCESS_KEY**
```
... (sua chave secreta AWS)
```

### 3. Verificar Permissões AWS

Certifique-se de que o usuário AWS tem as seguintes permissões:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "elasticbeanstalk:*",
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": "*"
        }
    ]
}
```

## 🔧 Configuração do Workflow

O arquivo `.github/workflows/deploy-beanstalk.yml` já está configurado com:

- ✅ **Trigger**: Push na branch `main`
- ✅ **Execução manual**: `workflow_dispatch`
- ✅ **Node.js 22**: Versão correta
- ✅ **Build automático**: `npm run build`
- ✅ **Testes**: `npm test --if-present`
- ✅ **Deploy**: Para `Servus-Back-Env`

## 🚀 Como Usar

### Deploy Automático
```bash
# Fazer push para triggerar deploy
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

### Deploy Manual
1. Vá para: `https://github.com/AndersonASP/servus_app_back/actions`
2. Clique em **Deploy to Elastic Beanstalk**
3. Clique em **Run workflow**
4. Selecione a branch `main`
5. Clique em **Run workflow**

## 📊 Monitoramento

### Verificar Status
1. Acesse: `https://github.com/AndersonASP/servus_app_back/actions`
2. Clique na execução mais recente
3. Verifique os logs de cada step

### Logs Importantes
- **Build**: Verificar se `npm run build` passou
- **Deploy**: Verificar se o upload para S3 foi bem-sucedido
- **Environment**: Verificar se o ambiente ficou "Ready"

## 🛠️ Troubleshooting

### Problemas Comuns

#### 1. **Erro de Permissão AWS**
```
Error: Access Denied
```
**Solução**: Verificar se os secrets estão corretos e o usuário tem permissões

#### 2. **Build Falha**
```
npm run build failed
```
**Solução**: Verificar se não há erros de TypeScript no código

#### 3. **Deploy Falha**
```
Environment update failed
```
**Solução**: Verificar logs do Beanstalk no AWS Console

### Comandos de Debug

```bash
# Verificar se o build funciona localmente
npm run build

# Testar deploy manual
eb deploy Servus-Back-Env

# Verificar status do ambiente
eb status Servus-Back-Env
```

## 📈 Melhorias Futuras

### 1. **Deploy por Ambiente**
- `main` → Produção
- `develop` → Desenvolvimento

### 2. **Notificações**
- Slack/Discord quando deploy falha
- Email para administradores

### 3. **Rollback Automático**
- Reverter para versão anterior se health check falhar

### 4. **Testes Automatizados**
- Testes de integração antes do deploy
- Testes de performance

## 🔗 Links Úteis

- [GitHub Actions Documentation](https://docs.github.com/pt/actions)
- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Beanstalk Deploy Action](https://github.com/einaregilsson/beanstalk-deploy)

## ✅ Checklist de Configuração

- [ ] Secrets configurados no GitHub
- [ ] Permissões AWS corretas
- [ ] Workflow funcionando
- [ ] Deploy automático testado
- [ ] Deploy manual testado
- [ ] Monitoramento configurado
