#!/bin/bash
# scripts/apply-migration-direct.sh
# Apply SQL migrations directly using psql and DATABASE_URL

# Load environment variables
set -a
source .env
set +a

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set in .env file"
  exit 1
fi

# Extract password from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Check for migration file argument or use latest
if [ -z "$1" ]; then
  # Find the latest migration for admin_deleteuser
  MIGRATION_FILE="supabase/migrations/20241213_005_admin_deleteuser_function.sql"
else
  MIGRATION_FILE="$1"
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📝 Applying migration: $MIGRATION_FILE"
echo ""

# Apply the migration using psql with password from env
PGPASSWORD="$DB_PASSWORD" psql "$DATABASE_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
else
  echo ""
  echo "❌ Migration failed. Please check the error above."
  exit 1
fi