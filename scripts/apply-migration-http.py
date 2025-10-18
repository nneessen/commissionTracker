#!/usr/bin/env python3
"""
Apply migration via Supabase HTTP API
This bypasses PostgreSQL port issues by using HTTPS
"""

import sys
import json
import urllib.request
import urllib.error

# Configuration
SUPABASE_URL = "https://pcyaqwodnyrpkaiojnpz.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y"
MIGRATION_FILE = "supabase/migrations/20251018_001_enhance_commission_chargeback_trigger.sql"

def read_migration():
    """Read the migration SQL file"""
    try:
        with open(MIGRATION_FILE, 'r') as f:
            return f.read()
    except Exception as e:
        print(f"❌ Failed to read migration file: {e}")
        sys.exit(1)

def execute_sql_batch(sql_statements):
    """Execute SQL statements via Supabase REST API"""
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

    success_count = 0
    total = len(sql_statements)

    for i, stmt in enumerate(sql_statements, 1):
        if not stmt.strip():
            continue

        print(f"Executing statement {i}/{total}...")

        # Try to execute via RPC if there's a helper function
        # Or try to use PostgREST's SQL execution capabilities
        try:
            # Attempt 1: Try RPC endpoint
            data = json.dumps({'query': stmt}).encode('utf-8')
            req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                data=data,
                headers=headers,
                method='POST'
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                result = response.read().decode('utf-8')
                print(f"  ✓ Statement {i} executed")
                success_count += 1

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            if 'function public.exec_sql' in error_body or 'PGRST202' in error_body:
                print(f"  ⚠ RPC method not available, statement {i} skipped")
            else:
                print(f"  ✗ Statement {i} failed: {error_body}")

        except Exception as e:
            print(f"  ✗ Statement {i} failed: {e}")

    return success_count

def main():
    print("========================================")
    print("   HTTP-Based Migration Application")
    print("========================================\n")

    print("Reading migration file...")
    sql = read_migration()

    print(f"Migration file size: {len(sql)} characters\n")

    # Split SQL into individual statements
    # Remove comments and split by semicolons
    lines = []
    for line in sql.split('\n'):
        # Keep lines that aren't pure comments
        stripped = line.strip()
        if stripped and not stripped.startswith('--'):
            lines.append(line)

    sql_cleaned = '\n'.join(lines)
    statements = [s.strip() for s in sql_cleaned.split(';') if s.strip()]

    print(f"Found {len(statements)} SQL statements\n")

    print("Attempting to execute via HTTP API...")
    success_count = execute_sql_batch(statements)

    print(f"\n========================================")
    if success_count > 0:
        print(f"✓ Successfully executed {success_count}/{len(statements)} statements")
        print("========================================\n")
        return 0
    else:
        print("✗ Unable to execute migration via HTTP API")
        print("========================================\n")
        print("The HTTP API method doesn't support DDL statements.")
        print("\nFalling back to alternative method...")
        return 1

if __name__ == "__main__":
    sys.exit(main())
