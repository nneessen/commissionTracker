#!/bin/bash
# scripts/fix-remote-database.sh
# Emergency fix for remote Supabase database after broken migration

set -e

echo "======================================"
echo "FIXING REMOTE SUPABASE DATABASE"
echo "======================================"

# Database connection details (using pooler)
DB_HOST="aws-0-us-east-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.pcyaqwodnyrpkaiojnpz"
DB_PASS="N123j234n345!\$!\$"

# Connection string
CONN_STR="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo ""
echo "Running diagnostic and fix SQL script..."
echo ""

psql "${CONN_STR}" -f /tmp/fix_remote_db.sql

echo ""
echo "======================================"
echo "FIX COMPLETE!"
echo "======================================"
echo ""
echo "Please refresh your dashboard to verify metrics are showing correctly."
