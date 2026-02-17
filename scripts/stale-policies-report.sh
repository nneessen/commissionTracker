#!/bin/bash
# scripts/stale-policies-report.sh
# ============================================================================
# STALE POLICIES REPORT
# ============================================================================
# Shows all policies NOT in active/placed/paid status where submit_date
# is 30+ days ago. Displays agent name, premium, dates, and statuses.
#
# Usage:
#   ./scripts/stale-policies-report.sh
#   ./scripts/stale-policies-report.sh 60    # Override to 60+ days
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL not set"
    exit 1
fi

CONN_STR="${DATABASE_URL}?sslmode=require"
DAYS_THRESHOLD="${1:-30}"

echo ""
echo "=================================================================="
echo "  STALE POLICIES REPORT"
echo "  Policies NOT active/placed/paid with submit_date ${DAYS_THRESHOLD}+ days ago"
echo "  Generated: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================================="
echo ""

psql "$CONN_STR" --no-align --pset=border=2 --pset=format=wrapped -c "
WITH stale_policies AS (
    SELECT
        p.id AS policy_id,
        COALESCE(up.first_name || ' ' || up.last_name, 'Unknown Agent') AS agent_name,
        up.email AS agent_email,
        c.name AS client_name,
        cr.name AS carrier_name,
        p.product,
        p.policy_number,
        p.status AS policy_status,
        p.lifecycle_status,
        p.monthly_premium,
        p.annual_premium,
        p.submit_date,
        p.effective_date,
        p.created_at,
        (CURRENT_DATE - p.submit_date::date) AS days_since_submit,
        comm.commission_status,
        comm.commission_amount
    FROM policies p
    LEFT JOIN user_profiles up ON up.id = p.user_id
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN carriers cr ON cr.id = p.carrier_id
    LEFT JOIN LATERAL (
        SELECT
            co.status AS commission_status,
            co.amount AS commission_amount
        FROM commissions co
        WHERE co.policy_id = p.id
        ORDER BY co.created_at DESC
        LIMIT 1
    ) comm ON true
    WHERE p.status NOT IN ('active', 'placed', 'paid')
      AND p.submit_date::date <= CURRENT_DATE - INTERVAL '${DAYS_THRESHOLD} days'
    ORDER BY days_since_submit DESC
)
SELECT
    agent_name AS \"Agent\",
    client_name AS \"Client\",
    carrier_name AS \"Carrier\",
    product AS \"Product\",
    COALESCE(policy_number, '—') AS \"Policy #\",
    policy_status AS \"Policy Status\",
    COALESCE(lifecycle_status, '—') AS \"Lifecycle\",
    COALESCE(commission_status, '—') AS \"Comm Status\",
    TO_CHAR(monthly_premium, '\$FM999,999.00') AS \"Mo Premium\",
    COALESCE(TO_CHAR(annual_premium, '\$FM999,999.00'), '—') AS \"Ann Premium\",
    TO_CHAR(submit_date::date, 'MM/DD/YYYY') AS \"Submitted\",
    TO_CHAR(effective_date::date, 'MM/DD/YYYY') AS \"Effective\",
    days_since_submit || ' days' AS \"Days Stale\"
FROM stale_policies;
"

echo ""

# Summary stats
psql "$CONN_STR" --no-align --pset=border=2 -c "
SELECT
    COUNT(*) AS \"Total Stale Policies\",
    COUNT(DISTINCT p.user_id) AS \"Agents Affected\",
    TO_CHAR(SUM(p.monthly_premium), '\$FM999,999,999.00') AS \"Total Monthly Premium\",
    TO_CHAR(COALESCE(SUM(p.annual_premium), 0), '\$FM999,999,999.00') AS \"Total Annual Premium\",
    TO_CHAR(MIN(p.submit_date::date), 'MM/DD/YYYY') AS \"Oldest Submit Date\",
    ROUND(AVG(CURRENT_DATE - p.submit_date::date)) || ' days' AS \"Avg Days Stale\"
FROM policies p
WHERE p.status NOT IN ('active', 'placed', 'paid')
  AND p.submit_date::date <= CURRENT_DATE - INTERVAL '${DAYS_THRESHOLD} days';
"

echo ""

# Breakdown by status
echo "-- Breakdown by Policy Status --"
echo ""
psql "$CONN_STR" --no-align --pset=border=2 -c "
SELECT
    p.status AS \"Policy Status\",
    COUNT(*) AS \"Count\",
    TO_CHAR(SUM(p.monthly_premium), '\$FM999,999.00') AS \"Total Mo Premium\"
FROM policies p
WHERE p.status NOT IN ('active', 'placed', 'paid')
  AND p.submit_date::date <= CURRENT_DATE - INTERVAL '${DAYS_THRESHOLD} days'
GROUP BY p.status
ORDER BY COUNT(*) DESC;
"

echo ""

# Breakdown by agent
echo "-- Breakdown by Agent --"
echo ""
psql "$CONN_STR" --no-align --pset=border=2 -c "
SELECT
    COALESCE(up.first_name || ' ' || up.last_name, 'Unknown') AS \"Agent\",
    COUNT(*) AS \"Stale Policies\",
    TO_CHAR(SUM(p.monthly_premium), '\$FM999,999.00') AS \"Total Mo Premium\",
    ROUND(AVG(CURRENT_DATE - p.submit_date::date)) || ' days' AS \"Avg Days Stale\"
FROM policies p
LEFT JOIN user_profiles up ON up.id = p.user_id
WHERE p.status NOT IN ('active', 'placed', 'paid')
  AND p.submit_date::date <= CURRENT_DATE - INTERVAL '${DAYS_THRESHOLD} days'
GROUP BY up.first_name, up.last_name
ORDER BY COUNT(*) DESC;
"

echo ""
echo "=================================================================="
echo "  END OF REPORT"
echo "=================================================================="
