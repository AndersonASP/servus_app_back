#!/bin/bash

# Script para fazer build do Flutter Web e copiar arquivos para o servidor

echo "🚀 Iniciando build do Flutter Web..."

# Navegar para o diretório do Flutter
cd ../servus_app

# Verificar se Flutter está instalado
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter não encontrado. Instale o Flutter primeiro."
    exit 1
fi

# Verificar se estamos no diretório correto
if [ ! -f "pubspec.yaml" ]; then
    echo "❌ Arquivo pubspec.yaml não encontrado. Execute este script do diretório servus-backend."
    exit 1
fi

# Limpar builds anteriores
echo "🧹 Limpando builds anteriores..."
flutter clean

# Fazer build para web
echo "🔨 Fazendo build para web..."
flutter build web --release

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo "✅ Build do Flutter Web concluído com sucesso!"
    echo "📁 Arquivos gerados em: build/web/"
    echo ""
    echo "📋 Arquivos disponíveis:"
    ls -la build/web/ | grep -E "\.(js|json|html)$"
    echo ""
    echo "🎯 Próximos passos:"
    echo "1. Reinicie o servidor NestJS"
    echo "2. Acesse: http://localhost:3000/forms/public/{form_id}"
    echo ""
else
    echo "❌ Erro no build do Flutter Web"
    exit 1
fi
