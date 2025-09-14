#!/bin/bash

# Script para configurar servidor EC2 com Node.js e Docker
# Execute este script no seu servidor EC2

set -e

echo "🚀 Configurando servidor EC2 para Servus Backend..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
sudo yum update -y

# Instalar Node.js 22
echo "🟢 Instalando Node.js 22..."
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# Verificar instalação
node --version
npm --version

# Instalar Docker
echo "🐳 Instalando Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Instalar Docker Compose
echo "🔧 Instalando Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar PM2 para gerenciar processos
echo "⚡ Instalando PM2..."
sudo npm install -g pm2

# Instalar Nginx
echo "🌐 Instalando Nginx..."
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configurar firewall
echo "🔒 Configurando firewall..."
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# Criar diretório da aplicação
echo "📁 Criando diretório da aplicação..."
sudo mkdir -p /var/www/servus-backend
sudo chown ec2-user:ec2-user /var/www/servus-backend

# Configurar Nginx
echo "⚙️ Configurando Nginx..."
sudo tee /etc/nginx/conf.d/servus-backend.conf > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Reiniciar Nginx
sudo systemctl restart nginx

# Configurar PM2 para iniciar automaticamente
echo "🔄 Configurando PM2..."
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Criar arquivo de configuração PM2
cat > /home/ec2-user/ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'servus-backend',
    script: 'dist/main.js',
    cwd: '/var/www/servus-backend',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/servus-backend-error.log',
    out_file: '/var/log/pm2/servus-backend-out.log',
    log_file: '/var/log/pm2/servus-backend.log',
    time: true
  }]
};
EOF

# Criar script de deploy
cat > /home/ec2-user/deploy.sh <<'EOF'
#!/bin/bash

# Script de deploy para EC2
set -e

echo "🚀 Iniciando deploy..."

# Ir para diretório da aplicação
cd /var/www/servus-backend

# Fazer backup da versão anterior
if [ -d "dist" ]; then
    echo "📦 Fazendo backup da versão anterior..."
    sudo cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)
fi

# Parar aplicação
echo "⏹️ Parando aplicação..."
pm2 stop servus-backend || true

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci --production

# Build da aplicação
echo "🔨 Fazendo build da aplicação..."
npm run build:prod

# Iniciar aplicação
echo "▶️ Iniciando aplicação..."
pm2 start ecosystem.config.js

# Verificar status
echo "✅ Verificando status..."
pm2 status

echo "🎉 Deploy concluído!"
echo "🌐 Aplicação disponível em: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
EOF

chmod +x /home/ec2-user/deploy.sh

# Criar diretório de logs
sudo mkdir -p /var/log/pm2
sudo chown ec2-user:ec2-user /var/log/pm2

echo ""
echo "✅ Configuração do servidor concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as variáveis de ambiente em /var/www/servus-backend/.env"
echo "2. Clone seu repositório: git clone https://github.com/SEU_USUARIO/servus_app_back.git /var/www/servus-backend"
echo "3. Execute o deploy: ./deploy.sh"
echo ""
echo "🔗 IP público do servidor: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
