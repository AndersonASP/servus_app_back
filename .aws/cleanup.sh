#!/bin/bash

# Script para limpar recursos AWS (usar com cuidado!)
# Execute apenas se quiser deletar toda a infraestrutura

set -e

# Variáveis
AWS_REGION="us-east-1"
CLUSTER_NAME="servus-backend-cluster"
SERVICE_NAME="servus-backend-service"
TASK_DEFINITION="servus-backend-task"
ECR_REPOSITORY="servus-backend"
VPC_NAME="servus-backend-vpc"
ALB_NAME="servus-backend-alb"
TARGET_GROUP_NAME="servus-backend-tg"
SECURITY_GROUP_NAME="servus-backend-sg"

echo "⚠️  ATENÇÃO: Este script irá deletar TODOS os recursos AWS!"
echo "Pressione Ctrl+C para cancelar ou Enter para continuar..."
read

echo "🧹 Iniciando limpeza dos recursos AWS..."

# 1. Parar e deletar ECS Service
echo "🛑 Parando ECS Service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --desired-count 0 || true

aws ecs delete-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME || true

# 2. Deletar ECS Cluster
echo "🐳 Deletando ECS Cluster..."
aws ecs delete-cluster \
  --cluster $CLUSTER_NAME || true

# 3. Deletar Load Balancer
echo "⚖️ Deletando Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names $ALB_NAME \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$ALB_ARN" ]; then
  # Deletar Listener
  LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn $ALB_ARN \
    --query 'Listeners[0].ListenerArn' \
    --output text 2>/dev/null || echo "")
  
  if [ ! -z "$LISTENER_ARN" ]; then
    aws elbv2 delete-listener \
      --listener-arn $LISTENER_ARN || true
  fi
  
  # Deletar Target Group
  TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
    --names $TARGET_GROUP_NAME \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>/dev/null || echo "")
  
  if [ ! -z "$TARGET_GROUP_ARN" ]; then
    aws elbv2 delete-target-group \
      --target-group-arn $TARGET_GROUP_ARN || true
  fi
  
  # Deletar Load Balancer
  aws elbv2 delete-load-balancer \
    --load-balancer-arn $ALB_ARN || true
fi

# 4. Deletar ECR Repository
echo "📦 Deletando ECR Repository..."
aws ecr delete-repository \
  --repository-name $ECR_REPOSITORY \
  --force || true

# 5. Deletar Secrets Manager
echo "🔐 Deletando Secrets Manager..."
aws secretsmanager delete-secret \
  --secret-id servus/mongo-uri \
  --force-delete-without-recovery || true

aws secretsmanager delete-secret \
  --secret-id servus/jwt-access-secret \
  --force-delete-without-recovery || true

aws secretsmanager delete-secret \
  --secret-id servus/jwt-refresh-secret \
  --force-delete-without-recovery || true

# 6. Deletar CloudWatch Log Group
echo "📊 Deletando CloudWatch Log Group..."
aws logs delete-log-group \
  --log-group-name /ecs/servus-backend || true

# 7. Deletar VPC e recursos relacionados
echo "📡 Deletando VPC e recursos..."
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=$VPC_NAME" \
  --query 'Vpcs[0].VpcId' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$VPC_ID" ] && [ "$VPC_ID" != "None" ]; then
  # Deletar Security Group
  SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "")
  
  if [ ! -z "$SECURITY_GROUP_ID" ] && [ "$SECURITY_GROUP_ID" != "None" ]; then
    aws ec2 delete-security-group \
      --group-id $SECURITY_GROUP_ID || true
  fi
  
  # Deletar Subnets
  SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[].SubnetId' \
    --output text 2>/dev/null || echo "")
  
  for SUBNET_ID in $SUBNET_IDS; do
    aws ec2 delete-subnet \
      --subnet-id $SUBNET_ID || true
  done
  
  # Deletar Route Tables
  ROUTE_TABLE_IDS=$(aws ec2 describe-route-tables \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'RouteTables[?Associations[0].Main!=`true`].RouteTableId' \
    --output text 2>/dev/null || echo "")
  
  for ROUTE_TABLE_ID in $ROUTE_TABLE_IDS; do
    aws ec2 delete-route-table \
      --route-table-id $ROUTE_TABLE_ID || true
  done
  
  # Deletar Internet Gateway
  IGW_ID=$(aws ec2 describe-internet-gateways \
    --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
    --query 'InternetGateways[0].InternetGatewayId' \
    --output text 2>/dev/null || echo "")
  
  if [ ! -z "$IGW_ID" ] && [ "$IGW_ID" != "None" ]; then
    aws ec2 detach-internet-gateway \
      --internet-gateway-id $IGW_ID \
      --vpc-id $VPC_ID || true
    
    aws ec2 delete-internet-gateway \
      --internet-gateway-id $IGW_ID || true
  fi
  
  # Deletar VPC
  aws ec2 delete-vpc \
    --vpc-id $VPC_ID || true
fi

echo ""
echo "✅ Limpeza concluída!"
echo "⚠️  Verifique se todos os recursos foram deletados no console AWS"
