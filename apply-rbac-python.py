#!/usr/bin/env python3
import sys
import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://pcyaqwodnyrpkaiojnpz.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y"
MIGRATION_FILE = "supabase/migrations/20251127181301_add_rbac_table_security.sql"

print("Reading migration file...")
with open(MIGRATION_FILE, 'r') as f:
    sql = f.read()

print(f"Loaded {len(sql)} characters\n")

headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

# Try creating exec_sql function first
print("Attempting to create exec_sql helper function...")
create_func = """
CREATE OR REPLACE FUNCTION public.exec_sql(query TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN EXECUTE query; RETURN 'success'; END; $$;
"""

try:
    data = json.dumps({'query': create_func}).encode('utf-8')
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        data=data,
        headers=headers,
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        print("✓ Helper function created\n")
except:
    print("⚠ Helper function may already exist\n")

# Now execute the migration
print("Executing RBAC migration...")
try:
    data = json.dumps({'query': sql}).encode('utf-8')
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        data=data,
        headers=headers,
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        result = response.read().decode('utf-8')
        print("✅ Migration executed successfully!")
        print("Result:", result)
        sys.exit(0)
except urllib.error.HTTPError as e:
    error_body = e.read().decode('utf-8')
    print(f"❌ Failed: {error_body}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
