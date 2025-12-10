#!/bin/bash
# /home/nneessen/projects/commissionTracker/scripts/apply-workflow-migration-direct.sh

echo "Applying workflow migration directly..."

# Copy just the workflow migration to a temp location
cp supabase/migrations/20251209_002_automation_workflows.sql /tmp/workflow_migration.sql

# Apply just this migration using psql
PGPASSWORD='N123j234n345!$!$' psql \
  -h aws-1-us-east-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.pcyaqwodnyrpkaiojnpz \
  -d postgres \
  -f /tmp/workflow_migration.sql \
  2>&1

echo "Workflow migration applied!"