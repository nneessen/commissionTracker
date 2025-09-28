#!/bin/bash

echo "🧪 Testing Commission Tracker API Endpoints"
echo "=========================================="

# Test GET agent_settings
echo -e "\n📋 GET /rest/v1/agent_settings"
curl -s http://localhost:3001/rest/v1/agent_settings | jq '.[0] | {id, full_name, email}'

# Test GET comp_guide with pagination
echo -e "\n📋 GET /rest/v1/comp_guide (paginated)"
curl -s "http://localhost:3001/rest/v1/comp_guide?page=1&limit=2" | jq '{total: .pagination.totalItems, data: .data | length}'

# Test GET carriers
echo -e "\n📋 GET /rest/v1/carriers"
curl -s http://localhost:3001/rest/v1/carriers | jq 'length'

# Test GET constants
echo -e "\n📋 GET /rest/v1/constants"
curl -s http://localhost:3001/rest/v1/constants | jq '.[0] | {key, value}'

echo -e "\n✅ All endpoints tested!"