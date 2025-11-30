#!/bin/bash
# Reset Recruit Progress Script
# Resets ALL recruits back to the initial phase and clears checklist progress
#
# Usage: ./scripts/reset-recruit-progress.sh
# WARNING: This is destructive and cannot be undone!

set -e

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection string (update if needed)
DB_URL="${DATABASE_URL:-postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-N123j234n345!\$!}"

echo "=========================================="
echo "  RECRUIT PROGRESS RESET SCRIPT"
echo "=========================================="
echo ""
echo "WARNING: This will reset ALL recruits to:"
echo "  - Phase: Phone Interview (first phase)"
echo "  - All checklist items: not_started"
echo "  - Onboarding status: interview_1"
echo ""
echo "This action CANNOT be undone!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Showing current state BEFORE reset..."
echo ""

PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -c "
SELECT
  up.email,
  up.onboarding_status,
  up.current_onboarding_phase,
  COUNT(DISTINCT rpp.id) as phase_records,
  COUNT(DISTINCT rcp.id) as checklist_records
FROM user_profiles up
LEFT JOIN recruit_phase_progress rpp ON rpp.user_id = up.id
LEFT JOIN recruit_checklist_progress rcp ON rcp.user_id = up.id
WHERE 'recruit' = ANY(up.roles)
GROUP BY up.id, up.email, up.onboarding_status, up.current_onboarding_phase;
"

echo ""
echo "Executing reset..."
echo ""

PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" <<'EOF'
BEGIN;

-- Reset recruit_phase_progress
UPDATE recruit_phase_progress rpp
SET
  status = CASE
    WHEN pp.phase_order = 1 THEN 'in_progress'
    ELSE 'not_started'
  END,
  started_at = CASE
    WHEN pp.phase_order = 1 THEN NOW()
    ELSE NULL
  END,
  completed_at = NULL,
  blocked_reason = NULL,
  notes = NULL,
  updated_at = NOW()
FROM pipeline_phases pp
WHERE rpp.phase_id = pp.id;

-- Reset recruit_checklist_progress
UPDATE recruit_checklist_progress
SET
  status = 'not_started',
  completed_at = NULL,
  completed_by = NULL,
  verified_at = NULL,
  verified_by = NULL,
  rejection_reason = NULL,
  document_id = NULL,
  notes = NULL,
  metadata = NULL,
  updated_at = NOW();

-- Reset user_profiles onboarding status for all recruits
UPDATE user_profiles
SET
  onboarding_status = 'interview_1',
  current_onboarding_phase = 'Phone Interview',
  onboarding_completed_at = NULL
WHERE 'recruit' = ANY(roles)
  AND onboarding_status IS NOT NULL;

COMMIT;
EOF

echo ""
echo "Reset complete! Showing state AFTER reset..."
echo ""

PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -c "
SELECT
  up.email,
  up.onboarding_status,
  up.current_onboarding_phase,
  (SELECT COUNT(*) FROM recruit_phase_progress WHERE user_id = up.id AND status = 'in_progress') as in_progress_phases,
  (SELECT COUNT(*) FROM recruit_checklist_progress WHERE user_id = up.id AND status != 'not_started') as completed_items
FROM user_profiles up
WHERE 'recruit' = ANY(up.roles);
"

echo ""
echo "Done!"
