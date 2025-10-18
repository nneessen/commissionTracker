#!/bin/bash
# Automated migration application with multiple fallback methods
# Will try all available methods until one succeeds

# Don't exit on error - we want to try all methods
set +e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

MIGRATION_FILE="supabase/migrations/20251018_001_enhance_commission_chargeback_trigger.sql"
DB_PASSWORD="N123j234n345!$!$"
DB_HOST="aws-1-us-east-2.pooler.supabase.com"
DB_PORT="6543"
DB_USER="postgres.pcyaqwodnyrpkaiojnpz"
DB_NAME="postgres"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Automated Migration Application${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Method 1: Try Windows psql via cmd.exe (bypasses WSL2 networking issues)
echo -e "${YELLOW}Method 1: Trying Windows psql...${NC}"
if command -v cmd.exe &> /dev/null; then
    # Convert WSL path to Windows path
    WIN_PATH=$(wslpath -w "$PWD/$MIGRATION_FILE" 2>/dev/null || echo "")

    if [ -n "$WIN_PATH" ]; then
        echo -e "${BLUE}Using Windows psql to bypass WSL2 networking...${NC}"

        # Check if psql is available in Windows
        if cmd.exe /c "where psql" &> /dev/null; then
            PGPASSWORD="$DB_PASSWORD" cmd.exe /c "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f \"$WIN_PATH\"" 2>&1

            if [ $? -eq 0 ]; then
                echo -e "\n${GREEN}✅ Migration applied successfully via Windows psql!${NC}"
                exit 0
            fi
        else
            echo -e "${YELLOW}Windows psql not found, trying next method...${NC}"
        fi
    fi
fi

# Method 2: Try WSL psql with IPv4 forced
echo -e "\n${YELLOW}Method 2: Trying WSL psql with IPv4...${NC}"
PGPASSWORD="$DB_PASSWORD" psql "postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}?host=${DB_HOST}&hostaddr=3.148.140.216" -f "$MIGRATION_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Migration applied successfully!${NC}"
    exit 0
fi

# Method 3: Try with Node.js and pg library with special options
echo -e "\n${YELLOW}Method 3: Trying Node.js with pg library...${NC}"
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
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

(async () => {
  try {
    await client.connect();
    const sql = fs.readFileSync('$MIGRATION_FILE', 'utf8');
    await client.query(sql);
    console.log('✅ Migration applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Method 3 failed:', error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
" 2>&1

if [ $? -eq 0 ]; then
    exit 0
fi

# Method 4: Try to restart WSL networking and retry
echo -e "\n${YELLOW}Method 4: Attempting to fix WSL2 networking...${NC}"

# Restart WSL networking (requires Windows)
if command -v powershell.exe &> /dev/null; then
    echo -e "${BLUE}Restarting WSL networking...${NC}"
    powershell.exe -Command "Get-NetAdapter | Where-Object {$_.InterfaceDescription -Match 'Hyper-V'} | Restart-NetAdapter" 2>&1 || true

    sleep 3

    # Retry psql after network restart
    PGPASSWORD="$DB_PASSWORD" psql "postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}" -f "$MIGRATION_FILE" 2>&1

    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✅ Migration applied successfully after network restart!${NC}"
        exit 0
    fi
fi

# Method 5: Try via PowerShell directly
echo -e "\n${YELLOW}Method 5: Trying PowerShell...${NC}"
if command -v powershell.exe &> /dev/null; then
    WIN_PATH=$(wslpath -w "$PWD/$MIGRATION_FILE")

    powershell.exe -Command "
        \$env:PGPASSWORD='$DB_PASSWORD'
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f '$WIN_PATH'
    " 2>&1

    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✅ Migration applied successfully via PowerShell!${NC}"
        exit 0
    fi
fi

# All methods failed
echo -e "\n${RED}========================================${NC}"
echo -e "${RED}   ✗ All Methods Failed${NC}"
echo -e "${RED}========================================${NC}\n"
echo -e "${RED}Unable to apply migration automatically.${NC}"
echo -e "${YELLOW}This appears to be a WSL2 networking issue.${NC}\n"
echo -e "${YELLOW}Please apply the migration manually via Supabase Dashboard:${NC}"
echo -e "1. Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new"
echo -e "2. Copy contents of: $MIGRATION_FILE"
echo -e "3. Paste and run in SQL editor\n"

exit 1
