#!/bin/bash
# scripts/apply-invitation-migrations.sh
# Apply hierarchy invitation system migrations to remote database

set +e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0;m'

DB_PASSWORD="N123j234n345!\$!\$"
DB_HOST="aws-1-us-east-2.pooler.supabase.com"
DB_PORT="6543"
DB_USER="postgres.pcyaqwodnyrpkaiojnpz"
DB_NAME="postgres"

MIGRATIONS=(
  "supabase/migrations/20251125_003_create_hierarchy_invitations.sql"
  "supabase/migrations/20251125_004_add_invitation_validation_functions.sql"
)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Invitation System Migration${NC}"
echo -e "${BLUE}========================================${NC}\n"

apply_migration_via_node() {
  local migration_file="$1"

  echo -e "${BLUE}Applying: $(basename "$migration_file")${NC}"

  node -e "
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: '$DB_HOST',
  port: $DB_PORT,
  database: '$DB_NAME',
  user: '$DB_USER',
  password: '$DB_PASSWORD',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

(async () => {
  try {
    await client.connect();
    const sql = fs.readFileSync('$migration_file', 'utf8');
    await client.query(sql);
    console.log('✅ Migration applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
" 2>&1

  return $?
}

verify_table() {
  echo -e "\n${BLUE}Verifying hierarchy_invitations table...${NC}"

  node -e "
const { Client } = require('pg');

const client = new Client({
  host: '$DB_HOST',
  port: $DB_PORT,
  database: '$DB_NAME',
  user: '$DB_USER',
  password: '$DB_PASSWORD',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    await client.connect();
    const result = await client.query(\"SELECT COUNT(*) FROM hierarchy_invitations\");
    console.log('✅ Table exists:', result.rows[0].count, 'rows');
    process.exit(0);
  } catch (error) {
    console.error('❌ Table verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
" 2>&1

  return $?
}

verify_functions() {
  echo -e "\n${BLUE}Verifying validation functions...${NC}"

  node -e "
const { Client } = require('pg');

const client = new Client({
  host: '$DB_HOST',
  port: $DB_PORT,
  database: '$DB_NAME',
  user: '$DB_USER',
  password: '$DB_PASSWORD',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    await client.connect();

    // Check all 3 functions exist
    const result = await client.query(\`
      SELECT proname
      FROM pg_proc
      WHERE proname IN (
        'check_email_exists',
        'validate_invitation_eligibility',
        'validate_invitation_acceptance'
      )
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    \`);

    console.log('✅ Found', result.rows.length, 'functions:');
    result.rows.forEach(row => console.log('  -', row.proname));

    if (result.rows.length === 3) {
      process.exit(0);
    } else {
      console.error('❌ Expected 3 functions, found', result.rows.length);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Function verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
" 2>&1

  return $?
}

# Apply each migration
SUCCESS=true
for migration in "${MIGRATIONS[@]}"; do
  if ! apply_migration_via_node "$migration"; then
    SUCCESS=false
    echo -e "${RED}Failed to apply: $migration${NC}"
    break
  fi
  echo ""
done

if [ "$SUCCESS" = true ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}   All Migrations Applied${NC}"
  echo -e "${GREEN}========================================${NC}\n"

  # Verify
  verify_table
  verify_functions

  echo -e "\n${GREEN}✅ Invitation system is ready!${NC}\n"
  exit 0
else
  echo -e "\n${RED}========================================${NC}"
  echo -e "${RED}   Migration Failed${NC}"
  echo -e "${RED}========================================${NC}\n"
  exit 1
fi
