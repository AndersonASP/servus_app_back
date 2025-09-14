# 🚀 Deploy no Railway - Guia Completo

## 💰 Custos
- **Plano Starter**: $5/mês
- **750 horas gratuitas** no primeiro mês
- **Domínio gratuito** (.railway.app)
- **Deploy automático** com GitHub

## 📋 Pré-requisitos
- Conta no Railway (gratuita)
- Conta no GitHub
- MongoDB Atlas (já configurado)

## 🛠️ Configuração Passo a Passo

### 1. Criar Conta no Railway
1. Acesse: https://railway.app
2. Clique em **"Start a New Project"**
3. Faça login com sua conta do **GitHub**
4. Autorize o Railway a acessar seus repositórios

### 2. Conectar Repositório
1. Clique em **"Deploy from GitHub repo"**
2. Selecione o repositório `servus_app_back`
3. Clique em **"Deploy Now"**

### 3. Configurar Variáveis de Ambiente
No dashboard do Railway, vá em **Variables** e adicione:

```
NODE_ENV=production
PORT=3000
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

### 4. Configurar GitHub Actions (Opcional)
Para deploy automático, configure os secrets no GitHub:

1. Vá em **Settings > Secrets and variables > Actions**
2. Adicione:
   - `RAILWAY_TOKEN`: Token do Railway (obtenha em Account Settings)
   - `RAILWAY_SERVICE_ID`: ID do serviço (obtenha no dashboard)
   - `RAILWAY_DOMAIN`: Domínio do Railway (ex: servus-backend-production.railway.app)

### 5. Testar Deploy
1. Acesse a URL fornecida pelo Railway
2. Teste: `https://SEU_DOMINIO.railway.app/health`
3. Teste login: `https://SEU_DOMINIO.railway.app/auth/login`

## 🔧 Configurações Avançadas

### Domínio Customizado
1. No Railway, vá em **Settings > Domains**
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções

### Monitoramento
- **Logs**: Disponível no dashboard do Railway
- **Métricas**: CPU, RAM, rede em tempo real
- **Health Check**: Automático em `/health`

### Scaling
- **Auto-scaling**: Ativado por padrão
- **Manual**: Ajuste recursos no dashboard
- **Sleep**: Aplicação "dorme" após inatividade (economia)

## 💡 Dicas de Economia

1. **Use Sleep Mode**: Aplicação dorme após inatividade
2. **Otimize Dockerfile**: Imagem menor = deploy mais rápido
3. **Monitore Uso**: Acompanhe métricas no dashboard
4. **Cache**: Railway faz cache automático de builds

## 🆘 Troubleshooting

### Problemas Comuns:

1. **Build falha**
   - Verifique logs no Railway
   - Confirme se todas as variáveis estão configuradas

2. **Aplicação não inicia**
   - Verifique se a porta está correta (3000)
   - Confirme se o comando de start está correto

3. **Erro de conexão MongoDB**
   - Verifique se o IP do Railway está na whitelist do MongoDB Atlas
   - Use `0.0.0.0/0` na whitelist (menos seguro, mas funciona)

### Logs Importantes:
```bash
# No dashboard do Railway, vá em Logs
# Procure por:
- "Application started successfully"
- "Connected to MongoDB"
- "Server running on port 3000"
```

## 📊 Comparação de Custos

| Serviço | Custo/Mês | Free Tier | Dificuldade |
|---------|-----------|-----------|-------------|
| **Railway** | $5 | 750h | ⭐⭐ |
| **Render** | $0 | 750h | ⭐⭐⭐ |
| **AWS ECS** | $15-20 | 12 meses | ⭐⭐⭐⭐⭐ |
| **Heroku** | $7 | 550h | ⭐⭐⭐ |

## ✅ Próximos Passos

1. ✅ Criar conta no Railway
2. ✅ Conectar repositório
3. ✅ Configurar variáveis
4. ✅ Fazer deploy
5. ✅ Testar aplicação
6. ✅ Configurar domínio (opcional)

## 🔗 Links Úteis

- [Railway Documentation](https://docs.railway.app/)
- [Railway Pricing](https://railway.app/pricing)
- [MongoDB Atlas Whitelist](https://docs.atlas.mongodb.com/security-whitelist/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
