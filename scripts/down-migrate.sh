#!/bin/bash
# ===========================================
# Down Migration Script para Cloudflare D1
# ===========================================
# Reverte migrações em ordem inversa.
# Uso:
#   ./down-migrate.sh              # Reverte última migração (local)
#   ./down-migrate.sh prod         # Reverte última migração (produção)
#   ./down-migrate.sh 005          # Reverte migração específica (local)
#   ./down-migrate.sh 005 prod     # Reverte migração específica (produção)
# ===========================================

set -euo pipefail

MIGRATIONS_DIR="backend/migrations"
ENV="${2:-local}"
TARGET="${1:-latest}"

# Flags para wrangler
if [ "$ENV" = "prod" ] || [ "$ENV" = "production" ]; then
  WRANGLER_FLAGS=""
  ENV_LABEL="PRODUCAO"
else
  WRANGLER_FLAGS="--local"
  ENV_LABEL="LOCAL"
fi

# Determinar qual migração reverter
if [ "$TARGET" = "latest" ]; then
  # Pegar a última migração aplicada
  LAST_MIGRATION=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort -V | tail -1)
  if [ -z "$LAST_MIGRATION" ]; then
    echo " Nenhuma migração encontrada em $MIGRATIONS_DIR"
    exit 1
  fi
  MIGRATION_NUM=$(basename "$LAST_MIGRATION" | cut -d'_' -f1)
else
  # Pad para 3 dígitos
  MIGRATION_NUM=$(printf "%03d" "$TARGET")
  LAST_MIGRATION="$MIGRATIONS_DIR/${MIGRATION_NUM}_*.sql"
  # Expand glob
  LAST_MIGRATION=$(ls -1 $LAST_MIGRATION 2>/dev/null | head -1)
  if [ -z "$LAST_MIGRATION" ]; then
    echo " Migração $MIGRATION_NUM não encontrada"
    exit 1
  fi
fi

# Verificar se existe down migration
DOWN_FILE="$MIGRATIONS_DIR/${MIGRATION_NUM}_down.sql"
if [ ! -f "$DOWN_FILE" ]; then
  echo " Down migration não encontrada: $DOWN_FILE"
  echo "💡 Crie o arquivo ${MIGRATION_NUM}_down.sql com o SQL reverso antes de reverter."
  exit 1
fi

echo "================================================"
echo "⚠️  DOWN MIGRATION — Ambiente: $ENV_LABEL"
echo "================================================"
echo "📄 Migração:     $(basename "$LAST_MIGRATION")"
echo "⬇️  Reversão:     $(basename "$DOWN_FILE")"
echo "🌍 Ambiente:      $ENV_LABEL"
echo "================================================"
echo ""
echo "⚠️  ATENÇÃO: Isso irá REVERTER dados permanentemente."
echo "    Certifique-se de ter um backup antes de prosseguir."
echo ""
read -p "Digite 'REVERT' para confirmar: " CONFIRM

if [ "$CONFIRM" != "REVERT" ]; then
  echo " Operação cancelada."
  exit 0
fi

echo ""
echo "⏳ Executando down migration..."
wrangler d1 execute oinbox-db $WRANGLER_FLAGS --file="$DOWN_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo " Down migration executada com sucesso."
  echo ""
  echo "📋 Próximo passo:"
  echo "   - Verifique o estado do banco"
  echo "   - Se necessário, reexecute a migração forward:"
  echo "     wrangler d1 execute oinbox-db $WRANGLER_FLAGS --file=$LAST_MIGRATION"
else
  echo ""
  echo " Falha na down migration!"
  echo "   Verifique os logs e o estado do banco antes de tentar novamente."
  exit 1
fi
