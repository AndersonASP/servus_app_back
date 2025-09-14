#!/bin/bash

# Script para criar infraestrutura AWS (Free Tier)
# Execute este script após configurar AWS CLI

set -e

# Variáveis
AWS_REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CLUSTER_NAME="servus-backend-cluster"
SERVICE_NAME="servus-backend-service"
TASK_DEFINITION="servus-backend-task"
ECR_REPOSITORY="servus-backend"
VPC_NAME="servus-backend-vpc"
SUBNET_NAME="servus-backend-subnet"
SECURITY_GROUP_NAME="servus-backend-sg"
ALB_NAME="servus-backend-alb"
TARGET_GROUP_NAME="servus-backend-tg"

echo "🚀 Criando infraestrutura AWS para Servus Backend..."
echo "📍 Região: $AWS_REGION"
echo "🏢 Account ID: $ACCOUNT_ID"

# 1. Criar VPC
echo "📡 Criando VPC..."
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value='$VPC_NAME'}]' \
  --query 'Vpc.VpcId' \
  --output text)

# Habilitar DNS
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames

# 2. Criar Internet Gateway
echo "🌐 Criando Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value='$VPC_NAME'-igw}]' \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

# Anexar ao VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID

# 3. Criar Subnets
echo "🏗️ Criando Subnets..."
SUBNET_1_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value='$SUBNET_NAME'-1}]' \
  --query 'Subnet.SubnetId' \
  --output text)

SUBNET_2_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone ${AWS_REGION}b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value='$SUBNET_NAME'-2}]' \
  --query 'Subnet.SubnetId' \
  --output text)

# 4. Criar Route Table
echo "🛣️ Criando Route Table..."
ROUTE_TABLE_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value='$VPC_NAME'-rt}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Adicionar rota para Internet
aws ec2 create-route \
  --route-table-id $ROUTE_TABLE_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

# Associar subnets à route table
aws ec2 associate-route-table \
  --subnet-id $SUBNET_1_ID \
  --route-table-id $ROUTE_TABLE_ID

aws ec2 associate-route-table \
  --subnet-id $SUBNET_2_ID \
  --route-table-id $ROUTE_TABLE_ID

# 5. Criar Security Group
echo "🔒 Criando Security Group..."
SECURITY_GROUP_ID=$(aws ec2 create-security-group \
  --group-name $SECURITY_GROUP_NAME \
  --description "Security group for Servus Backend" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Regras de entrada
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 3000 \
  --cidr 10.0.0.0/16

# 6. Criar ECR Repository
echo "📦 Criando ECR Repository..."
aws ecr create-repository \
  --repository-name $ECR_REPOSITORY \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true

# 7. Criar ECS Cluster
echo "🐳 Criando ECS Cluster..."
aws ecs create-cluster \
  --cluster-name $CLUSTER_NAME \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1

# 8. Criar CloudWatch Log Group
echo "📊 Criando CloudWatch Log Group..."
aws logs create-log-group \
  --log-group-name /ecs/servus-backend \
  --region $AWS_REGION

# 9. Criar Application Load Balancer
echo "⚖️ Criando Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name $ALB_NAME \
  --subnets $SUBNET_1_ID $SUBNET_2_ID \
  --security-groups $SECURITY_GROUP_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# 10. Criar Target Group
echo "🎯 Criando Target Group..."
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
  --name $TARGET_GROUP_NAME \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# 11. Criar Listener
echo "👂 Criando Listener..."
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN

# 12. Criar Secrets Manager
echo "🔐 Criando Secrets Manager..."
aws secretsmanager create-secret \
  --name servus/mongo-uri \
  --description "MongoDB connection string" \
  --secret-string "mongodb+srv://andersonalvestech:fxk8w5ySDM0h4CJR@servuscluster0.oevppgo.mongodb.net/servus?retryWrites=true&w=majority&appName=ServusCluster0"

aws secretsmanager create-secret \
  --name servus/jwt-access-secret \
  --description "JWT Access Secret" \
  --secret-string "e648f17ada79fecc378a31bb2c0a4fd72364c622d64c8c85487f09e6a8db7d07b20417fa46d7895014d5db7a6312730b3755698b9fe8a4c85043141e6186de60"

aws secretsmanager create-secret \
  --name servus/jwt-refresh-secret \
  --description "JWT Refresh Secret" \
  --secret-string "4312b0e8ed42686baabf1fe23ac0a8c58c6423e86e5b49ff67cbfa5a7fb267bcc5bb4f3b2e1236a8338a90300774e22f10ed3ce630d61cdbec2d58702f963575"

# 13. Atualizar Task Definition
echo "📝 Atualizando Task Definition..."
sed -i "s/ACCOUNT_ID/$ACCOUNT_ID/g" .aws/task-definition.json

# 14. Registrar Task Definition
echo "📋 Registrando Task Definition..."
aws ecs register-task-definition \
  --cli-input-json file://.aws/task-definition.json

# 15. Criar ECS Service
echo "🚀 Criando ECS Service..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --task-definition $TASK_DEFINITION \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1_ID,$SUBNET_2_ID],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=servus-backend,containerPort=3000"

# Obter DNS do Load Balancer
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo ""
echo "✅ Infraestrutura criada com sucesso!"
echo ""
echo "📋 Informações importantes:"
echo "🌐 Load Balancer DNS: $ALB_DNS"
echo "🔗 URL da API: http://$ALB_DNS"
echo "📊 Cluster ECS: $CLUSTER_NAME"
echo "🐳 ECR Repository: $ECR_REPOSITORY"
echo ""
echo "🔧 Próximos passos:"
echo "1. Configure os secrets no GitHub:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo "   - ALB_DNS_NAME=$ALB_DNS"
echo "2. Faça push do código para triggerar o deploy"
echo "3. Acesse: http://$ALB_DNS/health"
