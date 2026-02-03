#!/bin/bash
# scripts/migrations/audit-critical-functions.sh
# Audits critical database functions to ensure correct versions are deployed
# Usage: ./scripts/migrations/audit-critical-functions.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Source environment
source .env

# Connection string
CONN_STR="${DATABASE_URL}?sslmode=require"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Critical Functions Audit${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to check if a function contains expected content
check_function() {
    local func_name=$1
    local expected_pattern=$2
    local bad_pattern=$3
    local description=$4

    echo -e "${YELLOW}Checking: ${func_name}${NC}"
    echo -e "  Expected: ${description}"

    # Get function source
    local func_src=$(psql "${CONN_STR}" -t -A -c "SELECT prosrc FROM pg_proc WHERE proname = '${func_name}';")

    if [ -z "$func_src" ]; then
        echo -e "  ${RED}✗ Function not found!${NC}\n"
        return 1
    fi

    # Check for bad pattern
    if [ -n "$bad_pattern" ] && echo "$func_src" | grep -q "$bad_pattern"; then
        echo -e "  ${RED}✗ CONTAINS BUGGY PATTERN: ${bad_pattern}${NC}\n"
        return 1
    fi

    # Check for expected pattern
    if echo "$func_src" | grep -q "$expected_pattern"; then
        echo -e "  ${GREEN}✓ Contains expected pattern${NC}\n"
        return 0
    else
        echo -e "  ${RED}✗ Missing expected pattern: ${expected_pattern}${NC}\n"
        return 1
    fi
}

ERRORS=0

# Check get_slack_leaderboard_with_periods
echo -e "${BLUE}--- Slack Leaderboard Function ---${NC}"
if ! check_function \
    "get_slack_leaderboard_with_periods" \
    "p.submit_date = v_today" \
    "COALESCE.*created_at.*v_today" \
    "Uses p.submit_date = v_today (not COALESCE with created_at)"; then
    ERRORS=$((ERRORS + 1))
fi

# Check get_all_agencies_submit_totals
echo -e "${BLUE}--- Agency Totals Function ---${NC}"
if ! check_function \
    "get_all_agencies_submit_totals" \
    "p.submit_date >= v_week_start" \
    "COALESCE.*created_at.*v_week_start" \
    "Uses p.submit_date >= v_week_start (not COALESCE with created_at)"; then
    ERRORS=$((ERRORS + 1))
fi

echo -e "${BLUE}========================================${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}   ✅ All Critical Functions OK${NC}"
else
    echo -e "${RED}   ✗ ${ERRORS} Function(s) Need Fixing!${NC}"
fi
echo -e "${BLUE}========================================${NC}\n"

exit $ERRORS
