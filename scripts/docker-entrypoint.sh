#!/bin/sh
set -e

echo "🚀 Iniciando ambiente Oconnector..."

# Se for o container de backend, garante o setup do banco de dados D1 local
if [ "$SERVICE_TYPE" = "backend" ]; then
  echo "📦 Verificando banco de dados D1 local..."
  # Executa setup caso o banco não exista ou para garantir schema atualizado
  # npx wrangler d1 execute oinbox-db --file=./backend/schema.sql --local --persist
  npm run db:setup
  echo "✅ Banco de dados D1 pronto."
fi

# Executa o comando passado pelo Docker Compose
exec "$@"
