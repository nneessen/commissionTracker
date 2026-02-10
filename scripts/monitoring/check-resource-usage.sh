#!/usr/bin/env bash
# scripts/monitoring/check-resource-usage.sh
# Quick CLI snapshot of Supabase infrastructure resource usage

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Load .env
ENV_FILE="$PROJECT_ROOT/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
  exit 1
fi

source "$ENV_FILE"

# Validate required env vars
if [[ -z "${VITE_SUPABASE_URL:-}" ]]; then
  echo -e "${RED}Error: VITE_SUPABASE_URL not set in .env${NC}"
  exit 1
fi

if [[ -z "${SUPABASE_METRICS_PASSWORD:-}" ]]; then
  echo -e "${RED}Error: SUPABASE_METRICS_PASSWORD not set in .env${NC}"
  echo "Run ./scripts/monitoring/validate-metrics-endpoint.sh --setup-guide for setup help."
  exit 1
fi

# Extract project ref
PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed -E 's|https?://([^.]+)\.supabase\.co.*|\1|')
METRICS_URL="https://${PROJECT_REF}.supabase.co/customer/v1/privileged/metrics"

# Fetch metrics
METRICS=$(curl -sf -u "service_role:${SUPABASE_METRICS_PASSWORD}" "$METRICS_URL" 2>/dev/null) || {
  echo -e "${RED}Error: Failed to fetch metrics. Run validate-metrics-endpoint.sh to diagnose.${NC}"
  exit 1
}

# Helper: extract a single metric value by name (handles {labels} between name and value)
get_metric() {
  local pattern="$1"
  echo "$METRICS" | grep -E "^${pattern}(\{|[[:space:]])" | head -1 | awk '{print $NF}'
}

# Helper: color code a percentage value
color_pct() {
  local value="$1"
  local int_value
  int_value=$(printf "%.0f" "$value" 2>/dev/null || echo 0)
  if (( int_value >= 90 )); then
    echo -e "${RED}${value}%${NC}"
  elif (( int_value >= 75 )); then
    echo -e "${YELLOW}${value}%${NC}"
  else
    echo -e "${GREEN}${value}%${NC}"
  fi
}

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║       Supabase Resource Usage Snapshot           ║${NC}"
echo -e "${BOLD}${CYAN}║       Project: ${PROJECT_REF}        ║${NC}"
echo -e "${BOLD}${CYAN}║       $(date '+%Y-%m-%d %H:%M:%S %Z')                   ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# --- Memory ---
MEM_TOTAL=$(get_metric 'node_memory_MemTotal_bytes')
MEM_AVAILABLE=$(get_metric 'node_memory_MemAvailable_bytes')

if [[ -n "$MEM_TOTAL" && -n "$MEM_AVAILABLE" && "$MEM_TOTAL" != "0" ]]; then
  MEM_USED=$(awk "BEGIN {printf \"%.2f\", ($MEM_TOTAL - $MEM_AVAILABLE) / 1073741824}")
  MEM_TOTAL_GB=$(awk "BEGIN {printf \"%.2f\", $MEM_TOTAL / 1073741824}")
  MEM_PCT=$(awk "BEGIN {printf \"%.1f\", (1 - $MEM_AVAILABLE / $MEM_TOTAL) * 100}")
  echo -e "  ${BOLD}Memory:${NC}        ${MEM_USED} GB / ${MEM_TOTAL_GB} GB  $(color_pct "$MEM_PCT")"
else
  echo -e "  ${BOLD}Memory:${NC}        ${YELLOW}(data unavailable)${NC}"
fi

# --- Postgres Status ---
PG_UP=$(get_metric 'pg_up')

if [[ "$PG_UP" == "1" ]]; then
  echo -e "  ${BOLD}Postgres:${NC}      ${GREEN}UP${NC}"
elif [[ "$PG_UP" == "0" ]]; then
  echo -e "  ${BOLD}Postgres:${NC}      ${RED}DOWN${NC}"
else
  echo -e "  ${BOLD}Postgres:${NC}      ${YELLOW}(status unknown)${NC}"
fi

# --- Active Connections ---
CONNECTIONS=$(echo "$METRICS" | grep -E '^pg_stat_database_num_backends\{' | awk '{sum += $NF} END {print sum}')

if [[ -n "$CONNECTIONS" ]]; then
  CONN_COLOR="${GREEN}"
  if (( CONNECTIONS >= 150 )); then
    CONN_COLOR="${RED}"
  elif (( CONNECTIONS >= 100 )); then
    CONN_COLOR="${YELLOW}"
  fi
  echo -e "  ${BOLD}Connections:${NC}   ${CONN_COLOR}${CONNECTIONS}${NC} active"
else
  echo -e "  ${BOLD}Connections:${NC}   ${YELLOW}(data unavailable)${NC}"
fi

# --- Database Size ---
# Get the main postgres database size
DB_SIZE_BYTES=$(echo "$METRICS" | grep -E 'pg_database_size_bytes\{.*datname="postgres"' | awk '{print $NF}')

if [[ -n "$DB_SIZE_BYTES" ]]; then
  DB_SIZE_MB=$(awk "BEGIN {printf \"%.1f\", $DB_SIZE_BYTES / 1048576}")
  DB_SIZE_GB=$(awk "BEGIN {printf \"%.2f\", $DB_SIZE_BYTES / 1073741824}")
  if (( $(awk "BEGIN {print ($DB_SIZE_BYTES > 1073741824) ? 1 : 0}") )); then
    echo -e "  ${BOLD}DB Size:${NC}       ${DB_SIZE_GB} GB"
  else
    echo -e "  ${BOLD}DB Size:${NC}       ${DB_SIZE_MB} MB"
  fi
else
  echo -e "  ${BOLD}DB Size:${NC}       ${YELLOW}(data unavailable)${NC}"
fi

# --- Cache Hit Rate ---
# Note: Supabase exposes aggregated blks_hit/read_total (not per-database), so we use the total
BLKS_HIT=$(echo "$METRICS" | grep -E '^pg_stat_database_blks_hit_total\{' | head -1 | awk '{print $NF}')
BLKS_READ=$(echo "$METRICS" | grep -E '^pg_stat_database_blks_read_total\{' | head -1 | awk '{print $NF}')

if [[ -n "$BLKS_HIT" && -n "$BLKS_READ" ]]; then
  TOTAL_BLKS=$(awk "BEGIN {print $BLKS_HIT + $BLKS_READ}")
  if (( $(awk "BEGIN {print ($TOTAL_BLKS > 0) ? 1 : 0}") )); then
    CACHE_HIT_PCT=$(awk "BEGIN {printf \"%.2f\", ($BLKS_HIT / $TOTAL_BLKS) * 100}")
    CACHE_COLOR="${GREEN}"
    CACHE_INT=$(printf "%.0f" "$CACHE_HIT_PCT")
    if (( CACHE_INT < 95 )); then
      CACHE_COLOR="${RED}"
    elif (( CACHE_INT < 99 )); then
      CACHE_COLOR="${YELLOW}"
    fi
    echo -e "  ${BOLD}Cache Hit:${NC}     ${CACHE_COLOR}${CACHE_HIT_PCT}%${NC}"
  else
    echo -e "  ${BOLD}Cache Hit:${NC}     ${YELLOW}(no block activity yet)${NC}"
  fi
else
  echo -e "  ${BOLD}Cache Hit:${NC}     ${YELLOW}(data unavailable)${NC}"
fi

echo ""
echo -e "  ${CYAN}Thresholds: Memory/CPU ${GREEN}<75%${NC} | ${YELLOW}75-90%${NC} | ${RED}>90%${NC}"
echo -e "  ${CYAN}             Cache hit ${GREEN}>=99%${NC} | ${YELLOW}95-99%${NC} | ${RED}<95%${NC}"
echo -e "  ${CYAN}             Connections ${GREEN}<100${NC} | ${YELLOW}100-150${NC} | ${RED}>150${NC}"
echo ""
