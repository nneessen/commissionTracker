#!/usr/bin/env bash
# scripts/monitoring/validate-metrics-endpoint.sh
# Validates connectivity to Supabase Prometheus metrics endpoint

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Show setup guide if requested
if [[ "${1:-}" == "--setup-guide" ]]; then
  echo -e "${CYAN}=== Supabase Infrastructure Monitoring Setup Guide ===${NC}"
  echo ""
  echo "1. Get your Secret API Key:"
  echo "   Supabase Dashboard > Project Settings > API Keys > service_role (secret)"
  echo "   Format: eyJhbGciOiJIUzI1NiIs..."
  echo ""
  echo "2. Add to your .env file:"
  echo "   SUPABASE_METRICS_PASSWORD=<your-service-role-key>"
  echo ""
  echo "3. Validate connectivity:"
  echo "   ./scripts/monitoring/validate-metrics-endpoint.sh"
  echo ""
  echo "4. Connect Grafana Cloud:"
  echo "   Grafana Cloud > Connections > Add new connection > Supabase"
  echo "   Provide project ref + service_role key > scrape interval 60s"
  echo ""
  echo "5. Import dashboard:"
  echo "   Grafana Cloud > Dashboards > Import > upload scripts/monitoring/grafana-dashboard.json"
  echo ""
  echo "6. Set up Slack alerts:"
  echo "   a. Create #supabase-monitoring channel in Slack"
  echo "   b. Create Incoming Webhook in Slack app pointing to #supabase-monitoring"
  echo "   c. Grafana Cloud > Alerting > Contact points > Add Slack contact point > paste webhook URL"
  echo "   d. Create alert rules using definitions from scripts/monitoring/alert-rules.json"
  echo "   e. Set notification policy: route severity=warning|critical to the Slack contact point"
  echo ""
  exit 0
fi

# Load .env
ENV_FILE="$PROJECT_ROOT/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
  echo "Copy .env.example to .env and configure your credentials."
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
  echo ""
  echo "Add your Supabase service_role key to .env:"
  echo "  SUPABASE_METRICS_PASSWORD=<your-service-role-key>"
  echo ""
  echo "Find it at: Supabase Dashboard > Project Settings > API Keys > service_role (secret)"
  echo ""
  echo "Run with --setup-guide for full setup instructions."
  exit 1
fi

# Extract project ref from URL (e.g., https://pcyaqwodnyrpkaiojnpz.supabase.co -> pcyaqwodnyrpkaiojnpz)
PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed -E 's|https?://([^.]+)\.supabase\.co.*|\1|')

if [[ -z "$PROJECT_REF" ]]; then
  echo -e "${RED}Error: Could not extract project ref from VITE_SUPABASE_URL${NC}"
  echo "Expected format: https://<project-ref>.supabase.co"
  exit 1
fi

METRICS_URL="https://${PROJECT_REF}.supabase.co/customer/v1/privileged/metrics"

echo -e "${CYAN}=== Supabase Metrics Endpoint Validation ===${NC}"
echo ""
echo -e "Project Ref:  ${GREEN}${PROJECT_REF}${NC}"
echo -e "Metrics URL:  ${METRICS_URL}"
echo ""

# Fetch metrics
echo -e "${YELLOW}Fetching metrics...${NC}"
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -u "service_role:${SUPABASE_METRICS_PASSWORD}" \
  "$METRICS_URL" 2>&1) || {
  echo -e "${RED}Error: Connection failed. Check your network and Supabase URL.${NC}"
  exit 1
}

HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -1)

echo -e "HTTP Status:  ${HTTP_STATUS}"
echo ""

# Check status
if [[ "$HTTP_STATUS" == "401" ]]; then
  echo -e "${RED}Authentication failed (401 Unauthorized)${NC}"
  echo ""
  echo "Your SUPABASE_METRICS_PASSWORD is incorrect."
  echo "Ensure you're using the service_role (secret) key, not the anon key."
  echo "Find it at: Supabase Dashboard > Project Settings > API Keys"
  exit 1
elif [[ "$HTTP_STATUS" != "200" ]]; then
  echo -e "${RED}Unexpected HTTP status: ${HTTP_STATUS}${NC}"
  echo ""
  echo "Response body (first 500 chars):"
  echo "$HTTP_BODY" | head -c 500
  exit 1
fi

# Count metrics
METRIC_COUNT=$(echo "$HTTP_BODY" | grep -c '^[a-zA-Z_]' || true)
echo -e "${GREEN}Success! Received ${METRIC_COUNT} metric series${NC}"
echo ""

# Show sample metrics
echo -e "${CYAN}--- Sample Metrics ---${NC}"
echo ""

echo -e "${YELLOW}Memory:${NC}"
echo "$HTTP_BODY" | grep -E '^node_memory_(MemTotal|MemAvailable|MemFree)_bytes\{' | head -3 || echo "  (not found)"
echo ""

echo -e "${YELLOW}CPU:${NC}"
echo "$HTTP_BODY" | grep -E '^node_cpu_seconds_total\{.*mode="idle"' | head -2 || echo "  (not found)"
echo ""

echo -e "${YELLOW}Postgres Connections:${NC}"
echo "$HTTP_BODY" | grep -E '^pg_stat_database_num_backends\{' | head -3 || echo "  (not found)"
echo ""

echo -e "${YELLOW}Postgres Status:${NC}"
echo "$HTTP_BODY" | grep -E '^pg_up\{' || echo "  (not found)"
echo ""

echo -e "${YELLOW}Database Size:${NC}"
echo "$HTTP_BODY" | grep -E '^pg_database_size_bytes\{' | head -3 || echo "  (not found)"
echo ""

echo -e "${YELLOW}Cache Hit Rate:${NC}"
echo "$HTTP_BODY" | grep -E '^pg_stat_database_blks_(hit|read)_total\{' | head -4 || echo "  (not found)"
echo ""

echo -e "${GREEN}Validation complete. Metrics endpoint is working.${NC}"
