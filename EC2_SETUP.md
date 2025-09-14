# 🚀 Deploy AWS EC2 t2.micro - Guia Completo

## 💰 Custos
- **EC2 t2.micro**: 750 horas gratuitas/mês (12 meses)
- **EBS Storage**: 30GB gratuitos
- **Data Transfer**: 1GB gratuitos
- **Total**: $0/mês (primeiro ano)

## 📋 Pré-requisitos
- Conta AWS (gratuita)
- Chave SSH
- MongoDB Atlas (já configurado)

## 🛠️ Configuração Passo a Passo

### 1. Criar Instância EC2

#### 1.1. Acessar Console AWS
1. Acesse: https://console.aws.amazon.com
2. Faça login na sua conta
3. Vá em **EC2 > Instances**

#### 1.2. Launch Instance
1. Clique em **"Launch Instance"**
2. **Name**: `servus-backend`
3. **AMI**: Amazon Linux 2023 (Free tier eligible)
4. **Instance Type**: t2.micro (Free tier eligible)
5. **Key Pair**: Crie uma nova chave SSH
6. **Security Group**: Configure as regras:
   - SSH (22): Your IP
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
   - Custom TCP (3000): 0.0.0.0/0

#### 1.3. Storage
- **Size**: 8GB (gratuito)
- **Volume Type**: gp3

### 2. Conectar ao Servidor

#### 2.1. Obter IP Público
```bash
# No console AWS, copie o Public IPv4 address
# Exemplo: 3.15.123.45
```

#### 2.2. Conectar via SSH
```bash
# Conectar ao servidor
ssh -i "sua-chave.pem" ec2-user@SEU_IP_PUBLICO

# Exemplo:
ssh -i "servus-key.pem" ec2-user@3.15.123.45
```

### 3. Configurar Servidor

#### 3.1. Executar Script de Setup
```bash
# No servidor EC2, execute:
curl -o ec2-setup.sh https://raw.githubusercontent.com/SEU_USUARIO/servus_app_back/main/.aws/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

#### 3.2. Configurar Variáveis de Ambiente
```bash
# Criar arquivo .env
sudo nano /var/www/servus-backend/.env
```

Adicione as seguintes variáveis:
```env
NODE_ENV=production
PORT=3000
API_PREFIX=api
MONGO_URI=mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0
JWT_ACCESS_SECRET=e648f17ada79fecc378a31bb2c0a4fd72364c622d64c8c85487f09e6a8db7d07b20417fa46d7895014d5db7a6312730b3755698b9fe8a4c85043141e6186de60
JWT_REFRESH_SECRET=4312b0e8ed42686baabf1fe23ac0a8c58c6423e86e5b49ff67cbfa5a7fb267bcc5bb4f3b2e1236a8338a90300774e22f10ed3ce630d61cdbec2d58702f963575
JWT_ACCESS_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800
JWT_ABSOLUTE_EXPIRES_IN=2592000
CORS_ORIGIN=http://SEU_IP_PUBLICO,https://servusapp.com
LOG_LEVEL=warn
```

### 4. Fazer Deploy da Aplicação

#### 4.1. Clone do Repositório
```bash
# No servidor EC2
cd /var/www
sudo git clone https://github.com/SEU_USUARIO/servus_app_back.git servus-backend
sudo chown -R ec2-user:ec2-user servus-backend
cd servus-backend
```

#### 4.2. Deploy Manual
```bash
# Executar deploy
./deploy.sh
```

#### 4.3. Verificar Deploy
```bash
# Verificar status
pm2 status

# Ver logs
pm2 logs servus-backend

# Testar aplicação
curl http://localhost:3000/health
```

### 5. Configurar Deploy Automático

#### 5.1. Configurar Secrets no GitHub
No seu repositório GitHub, vá em **Settings > Secrets and variables > Actions** e adicione:

- `EC2_SSH_KEY`: Conteúdo da sua chave SSH (.pem)
- `EC2_HOST`: IP público do seu servidor EC2

#### 5.2. Fazer Push para Triggerar Deploy
```bash
# No seu computador local
git add .
git commit -m "feat: adicionar configuração EC2"
git push origin main
```

## 🔧 Gerenciamento do Servidor

### Comandos Úteis

```bash
# Ver status da aplicação
pm2 status

# Ver logs
pm2 logs servus-backend

# Reiniciar aplicação
pm2 restart servus-backend

# Parar aplicação
pm2 stop servus-backend

# Iniciar aplicação
pm2 start servus-backend

# Ver logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver status do sistema
htop
df -h
free -h
```

### Monitoramento

```bash
# Ver uso de CPU e RAM
htop

# Ver espaço em disco
df -h

# Ver processos Node.js
ps aux | grep node

# Ver portas em uso
netstat -tlnp
```

## 🔒 Segurança

### Configurar Firewall
```bash
# Ver regras ativas
sudo firewall-cmd --list-all

# Adicionar regra (se necessário)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### Configurar SSL (Opcional)
```bash
# Instalar Certbot
sudo yum install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d SEU_DOMINIO.com
```

## 💡 Otimizações

### 1. Configurar Swap
```bash
# Criar arquivo de swap
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Otimizar Node.js
```bash
# Configurar PM2 com cluster
pm2 start ecosystem.config.js --instances max
```

### 3. Configurar Logrotate
```bash
# Configurar rotação de logs
sudo nano /etc/logrotate.d/servus-backend
```

Adicione:
```
/var/log/pm2/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 🆘 Troubleshooting

### Problemas Comuns:

1. **Aplicação não inicia**
   ```bash
   # Verificar logs
   pm2 logs servus-backend
   
   # Verificar se a porta está em uso
   netstat -tlnp | grep 3000
   ```

2. **Erro de permissão**
   ```bash
   # Corrigir permissões
   sudo chown -R ec2-user:ec2-user /var/www/servus-backend
   ```

3. **Nginx não funciona**
   ```bash
   # Verificar configuração
   sudo nginx -t
   
   # Reiniciar Nginx
   sudo systemctl restart nginx
   ```

4. **MongoDB não conecta**
   - Verificar se o IP do EC2 está na whitelist do MongoDB Atlas
   - Usar `0.0.0.0/0` na whitelist (menos seguro, mas funciona)

### Logs Importantes:
```bash
# Logs da aplicação
pm2 logs servus-backend

# Logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Logs do sistema
sudo journalctl -u nginx
```

## 📊 Monitoramento de Custos

### Verificar Uso Gratuito:
1. Acesse **AWS Billing Dashboard**
2. Vá em **Free Tier**
3. Monitore uso de:
   - EC2 Instance Hours
   - EBS Storage
   - Data Transfer

### Alertas de Cobrança:
1. Configure **Billing Alerts**
2. Defina limite de $1
3. Receba notificações por email

## ✅ Checklist de Deploy

- [ ] Instância EC2 criada
- [ ] Security Group configurado
- [ ] Chave SSH criada
- [ ] Conectado via SSH
- [ ] Script de setup executado
- [ ] Variáveis de ambiente configuradas
- [ ] Repositório clonado
- [ ] Deploy executado
- [ ] Aplicação funcionando
- [ ] Health check OK
- [ ] Nginx configurado
- [ ] Deploy automático configurado

## 🔗 Links Úteis

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [MongoDB Atlas Whitelist](https://docs.atlas.mongodb.com/security-whitelist/)

## 💰 Estimativa de Custos

| Recurso | Free Tier | Após Free Tier |
|---------|-----------|----------------|
| EC2 t2.micro | 750h/mês | $8.50/mês |
| EBS Storage | 30GB | $3.00/mês |
| Data Transfer | 1GB | $0.09/GB |
| **Total** | **$0/mês** | **~$12/mês** |
