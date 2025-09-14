# 🌱 Deploy AWS Elastic Beanstalk - Guia Completo

## 💰 Custos
- **t3.micro**: 750 horas gratuitas/mês (12 meses)
- **Load Balancer**: 750 horas gratuitas/mês
- **EBS Storage**: 30GB gratuitos
- **Data Transfer**: 1GB gratuitos
- **Total**: $0/mês (primeiro ano)

## 📋 Pré-requisitos
- Conta AWS (gratuita)
- AWS CLI configurado
- EB CLI instalado
- MongoDB Atlas (já configurado)

## 🛠️ Configuração Passo a Passo

### 1. Instalar EB CLI

#### 1.1. Instalar via pip
```bash
# Instalar EB CLI
pip install awsebcli --upgrade --user

# Adicionar ao PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verificar instalação
eb --version
```

#### 1.2. Configurar AWS CLI
```bash
# Configurar credenciais
aws configure

# Verificar configuração
aws sts get-caller-identity
```

### 2. Inicializar Aplicação Beanstalk

#### 2.1. No diretório do projeto
```bash
# Inicializar EB
eb init servus-backend

# Selecionar:
# - Region: us-east-1
# - Platform: Node.js 18
# - CodeCommit: No
# - SSH: Yes (opcional)
```

#### 2.2. Criar Ambiente
```bash
# Criar ambiente de produção
eb create servus-backend-prod

# Selecionar:
# - Environment tier: WebServer
# - Load balancer type: Classic Load Balancer
# - Instance type: t3.micro
# - Key pair: Sua chave SSH (opcional)
```

### 3. Configurar Variáveis de Ambiente

#### 3.1. Via Console AWS
1. Acesse: https://console.aws.amazon.com/elasticbeanstalk
2. Selecione sua aplicação
3. Vá em **Configuration > Software**
4. Adicione as variáveis:

```
NODE_ENV=production
PORT=8080
API_PREFIX=api
MONGO_URI=mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0
JWT_ACCESS_SECRET=e648f17ada79fecc378a31bb2c0a4fd72364c622d64c8c85487f09e6a8db7d07b20417fa46d7895014d5db7a6312730b3755698b9fe8a4c85043141e6186de60
JWT_REFRESH_SECRET=4312b0e8ed42686baabf1fe23ac0a8c58c6423e86e5b49ff67cbfa5a7fb267bcc5bb4f3b2e1236a8338a90300774e22f10ed3ce630d61cdbec2d58702f963575
JWT_ACCESS_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800
JWT_ABSOLUTE_EXPIRES_IN=2592000
CORS_ORIGIN=https://servusapp.com,https://www.servusapp.com
LOG_LEVEL=warn
```

#### 3.2. Via EB CLI
```bash
# Configurar variáveis
eb setenv NODE_ENV=production
eb setenv PORT=8080
eb setenv API_PREFIX=api
eb setenv MONGO_URI="mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0"
eb setenv JWT_ACCESS_SECRET="e648f17ada79fecc378a31bb2c0a4fd72364c622d64c8c85487f09e6a8db7d07b20417fa46d7895014d5db7a6312730b3755698b9fe8a4c85043141e6186de60"
eb setenv JWT_REFRESH_SECRET="4312b0e8ed42686baabf1fe23ac0a8c58c6423e86e5b49ff67cbfa5a7fb267bcc5bb4f3b2e1236a8338a90300774e22f10ed3ce630d61cdbec2d58702f963575"
eb setenv CORS_ORIGIN="https://servusapp.com,https://www.servusapp.com"
eb setenv LOG_LEVEL=warn
```

### 4. Fazer Deploy

#### 4.1. Deploy Manual
```bash
# Fazer deploy
eb deploy servus-backend-prod

# Verificar status
eb status

# Ver logs
eb logs
```

#### 4.2. Deploy Automático (GitHub Actions)
1. Configure os secrets no GitHub:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
2. Faça push para triggerar deploy:
```bash
git add .
git commit -m "feat: adicionar configuração Beanstalk"
git push origin main
```

### 5. Verificar Deploy

#### 5.1. Obter URL
```bash
# Obter URL da aplicação
eb status

# Exemplo de saída:
# Environment URL: http://servus-backend-prod.us-east-1.elasticbeanstalk.com
```

#### 5.2. Testar Aplicação
```bash
# Health check
curl http://servus-backend-prod.us-east-1.elasticbeanstalk.com/health

# Testar login
curl -X POST http://servus-backend-prod.us-east-1.elasticbeanstalk.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"servus_admin@servus.com","password":"servus123"}'
```

## 🔧 Gerenciamento

### Comandos Úteis

```bash
# Ver status
eb status

# Ver logs
eb logs

# Abrir aplicação no navegador
eb open

# SSH no servidor
eb ssh

# Ver configuração
eb config

# Listar ambientes
eb list

# Terminar ambiente
eb terminate servus-backend-prod
```

### Monitoramento

```bash
# Ver logs em tempo real
eb logs --all

# Ver logs de erro
eb logs --all | grep ERROR

# Ver métricas
eb health
```

## 🔒 Segurança

### Configurar HTTPS (Opcional)

#### 1. Obter Certificado SSL
```bash
# Via AWS Certificate Manager
# 1. Acesse: https://console.aws.amazon.com/acm
# 2. Request a certificate
# 3. Add domain name
# 4. Validate certificate
```

#### 2. Configurar Load Balancer
```bash
# Via Console AWS
# 1. Acesse: https://console.aws.amazon.com/elasticbeanstalk
# 2. Configuration > Load balancer
# 3. Add listener: HTTPS (443)
# 4. Select SSL certificate
```

## 💡 Otimizações

### 1. Configurar Auto Scaling
```bash
# Via Console AWS
# 1. Configuration > Capacity
# 2. Enable auto scaling
# 3. Min instances: 1
# 4. Max instances: 3
# 5. Scale based on: CPU utilization
```

### 2. Configurar Health Checks
```bash
# Via Console AWS
# 1. Configuration > Software
# 2. Health check URL: /health
# 3. Health check grace period: 300
```

### 3. Configurar Logs
```bash
# Via Console AWS
# 1. Configuration > Software
# 2. Log streaming: Enabled
# 3. Log retention: 7 days
```

## 🆘 Troubleshooting

### Problemas Comuns:

1. **Deploy falha**
   ```bash
   # Ver logs detalhados
   eb logs --all
   
   # Verificar configuração
   eb config
   ```

2. **Aplicação não inicia**
   ```bash
   # Verificar logs da aplicação
   eb logs --all | grep "Application"
   
   # Verificar variáveis de ambiente
   eb printenv
   ```

3. **Erro de conexão MongoDB**
   - Verificar se o IP do Beanstalk está na whitelist do MongoDB Atlas
   - Usar `0.0.0.0/0` na whitelist (menos seguro, mas funciona)

4. **Health check falha**
   ```bash
   # Verificar se o endpoint /health está funcionando
   curl http://localhost:8080/health
   ```

### Logs Importantes:
```bash
# Logs da aplicação
eb logs --all | grep "Application"

# Logs do Nginx
eb logs --all | grep "nginx"

# Logs de erro
eb logs --all | grep "ERROR"
```

## 📊 Comparação de Custos

| Serviço | Custo/Mês | Free Tier | Dificuldade |
|---------|-----------|-----------|-------------|
| **Elastic Beanstalk** | $0 | 750h | ⭐⭐⭐ |
| **EC2 t2.micro** | $0 | 750h | ⭐⭐⭐⭐ |
| **ECS Fargate** | $15-20 | 12 meses | ⭐⭐⭐⭐⭐ |
| **Railway** | $5 | 750h | ⭐⭐ |

## ✅ Checklist de Deploy

- [ ] EB CLI instalado
- [ ] AWS CLI configurado
- [ ] Aplicação inicializada
- [ ] Ambiente criado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy executado
- [ ] Aplicação funcionando
- [ ] Health check OK
- [ ] Deploy automático configurado

## 🔗 Links Úteis

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [EB CLI Documentation](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [MongoDB Atlas Whitelist](https://docs.atlas.mongodb.com/security-whitelist/)

## 💰 Estimativa de Custos

| Recurso | Free Tier | Após Free Tier |
|---------|-----------|----------------|
| EC2 t3.micro | 750h/mês | $8.50/mês |
| Load Balancer | 750h/mês | $18.00/mês |
| EBS Storage | 30GB | $3.00/mês |
| Data Transfer | 1GB | $0.09/GB |
| **Total** | **$0/mês** | **~$30/mês** |

## 🎯 Vantagens do Beanstalk

- ✅ **Deploy Simples**: Um comando para deploy
- ✅ **Auto Scaling**: Configurável via console
- ✅ **Load Balancer**: Incluído automaticamente
- ✅ **Health Checks**: Automáticos
- ✅ **Logs Centralizados**: Fácil monitoramento
- ✅ **Rollback**: Fácil reverter versões
- ✅ **Zero Downtime**: Deploy sem interrupção
