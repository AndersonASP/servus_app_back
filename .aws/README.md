# 🚀 Deploy Automático AWS + GitHub Actions

Este diretório contém todos os arquivos necessários para fazer deploy automático da API Servus no AWS usando GitHub Actions.

## 📋 Pré-requisitos

1. **Conta AWS** com acesso ao Free Tier
2. **AWS CLI** configurado localmente
3. **GitHub** com repositório configurado
4. **Docker** instalado (para testes locais)

## 🛠️ Configuração Inicial

### 1. Configurar AWS CLI

```bash
# Instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configurar credenciais
aws configure
```

### 2. Criar Usuário IAM

No console AWS, crie um usuário IAM com as seguintes permissões:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:*",
                "ecs:*",
                "ec2:*",
                "elasticloadbalancing:*",
                "logs:*",
                "secretsmanager:*",
                "iam:PassRole"
            ],
            "Resource": "*"
        }
    ]
}
```

### 3. Configurar Secrets no GitHub

No seu repositório GitHub, vá em **Settings > Secrets and variables > Actions** e adicione:

- `AWS_ACCESS_KEY_ID`: Sua chave de acesso AWS
- `AWS_SECRET_ACCESS_KEY`: Sua chave secreta AWS
- `ALB_DNS_NAME`: Será preenchido automaticamente após criar a infraestrutura

## 🚀 Deploy

### 1. Criar Infraestrutura AWS

```bash
# Executar script de criação
./.aws/infrastructure.sh
```

Este script criará:
- ✅ VPC com subnets públicas
- ✅ Security Groups
- ✅ ECS Cluster (Fargate)
- ✅ ECR Repository
- ✅ Application Load Balancer
- ✅ CloudWatch Logs
- ✅ Secrets Manager
- ✅ ECS Service

### 2. Fazer Deploy da Aplicação

```bash
# Fazer push para triggerar o deploy
git add .
git commit -m "feat: adicionar configuração AWS"
git push origin main
```

O GitHub Actions irá:
- ✅ Executar testes
- ✅ Fazer build da aplicação
- ✅ Criar imagem Docker
- ✅ Fazer push para ECR
- ✅ Deploy no ECS

### 3. Verificar Deploy

```bash
# Obter URL do Load Balancer
aws elbv2 describe-load-balancers \
  --names servus-backend-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text

# Testar health check
curl http://SEU_ALB_DNS/health
```

## 📊 Monitoramento

### CloudWatch Logs
- **Log Group**: `/ecs/servus-backend`
- **Stream**: `ecs/servus-backend/container-id`

### ECS Console
- **Cluster**: `servus-backend-cluster`
- **Service**: `servus-backend-service`

## 💰 Custos (Free Tier)

### Recursos Gratuitos (12 meses):
- ✅ **ECS Fargate**: 20,000 segundos/mês
- ✅ **ECR**: 500MB de armazenamento
- ✅ **Application Load Balancer**: 750 horas/mês
- ✅ **CloudWatch Logs**: 5GB/mês
- ✅ **Secrets Manager**: 10,000 requests/mês

### Estimativa de Custo:
- **Fargate (256 CPU, 512MB RAM)**: ~$0.02/hora
- **ALB**: ~$0.02/hora
- **Total estimado**: ~$15-20/mês (após free tier)

## 🔧 Troubleshooting

### Problemas Comuns:

1. **Erro de permissões IAM**
   ```bash
   # Verificar permissões
   aws sts get-caller-identity
   ```

2. **Falha no deploy ECS**
   ```bash
   # Verificar logs
   aws logs tail /ecs/servus-backend --follow
   ```

3. **Health check falhando**
   ```bash
   # Verificar se a aplicação está rodando
   aws ecs describe-services \
     --cluster servus-backend-cluster \
     --services servus-backend-service
   ```

### Logs Importantes:

```bash
# Logs da aplicação
aws logs tail /ecs/servus-backend --follow

# Logs do ECS
aws ecs describe-services \
  --cluster servus-backend-cluster \
  --services servus-backend-service \
  --query 'services[0].events'
```

## 🧹 Limpeza

Para deletar todos os recursos (cuidado!):

```bash
./.aws/cleanup.sh
```

## 📚 Arquivos Importantes

- `Dockerfile`: Configuração da imagem Docker
- `.github/workflows/deploy-aws.yml`: Pipeline CI/CD
- `.aws/task-definition.json`: Configuração do container ECS
- `.aws/infrastructure.sh`: Script de criação da infraestrutura
- `.aws/cleanup.sh`: Script de limpeza

## 🔗 Links Úteis

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
