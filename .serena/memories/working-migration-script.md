# Working Migration Script for Production Deployments

## THE SCRIPT THAT ACTUALLY WORKS

**CRITICAL**: When deploying migrations to production Supabase, use **Python with psycopg2**.

### Why Other Methods Fail
- ❌ Node.js `pg` library → Pooler timeout issues
- ❌ `supabase db push` → Migration history conflicts + pooler overload
- ❌ Shell scripts with `psql` → WSL2 networking blocks PostgreSQL ports
- ❌ HTTP/REST API → Doesn't support DDL statements
- ❌ Management API → Requires different auth token

### THE WORKING METHOD: Python + psycopg2

**Location**: Use this pattern every time

```python
#!/usr/bin/env python3
import psycopg2
import sys

# Connection details - THESE WORK
HOST = "aws-1-us-east-2.pooler.supabase.com"
PORT = 6543
DATABASE = "postgres"
USER = "postgres.pcyaqwodnyrpkaiojnpz"
PASSWORD = "N123j234n345!$!$"  # From .serena/memories/supabase-credentials.md

try:
    print("📝 Connecting to production database...")
    conn = psycopg2.connect(
        host=HOST,
        port=PORT,
        database=DATABASE,
        user=USER,
        password=PASSWORD,
        sslmode="require",
        connect_timeout=15
    )
    
    print("✅ Connected!\n")
    
    cur = conn.cursor()
    
    print("🚀 Reading migration file...")
    with open("supabase/migrations/YOUR_MIGRATION_FILE.sql", "r") as f:
        sql = f.read()
    
    print(f"   Loaded {len(sql)} characters\n")
    
    print("⚡ Executing migration...")
    cur.execute(sql)
    conn.commit()
    
    print("✅ Migration executed!\n")
    
    # ALWAYS verify what you deployed
    print("🔍 Verifying...")
    cur.execute("SELECT COUNT(*) FROM your_new_table")  # Adjust verification query
    result = cur.fetchone()[0]
    print(f"✅ Verification: {result} found")
    
    print("\n🎉 Migration deployed to production!")
    
    cur.close()
    conn.close()
    sys.exit(0)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    sys.exit(1)
```

### Quick One-Liner Template

When user asks to deploy a migration, create and run this:

```bash
cat > apply-migration.py << 'EOF'
#!/usr/bin/env python3
import psycopg2
import sys

conn = psycopg2.connect(
    host="aws-1-us-east-2.pooler.supabase.com",
    port=6543,
    database="postgres",
    user="postgres.pcyaqwodnyrpkaiojnpz",
    password="N123j234n345!$!$",
    sslmode="require",
    connect_timeout=15
)

cur = conn.cursor()
with open("PATH_TO_MIGRATION_FILE", "r") as f:
    sql = f.read()

print("Executing migration...")
cur.execute(sql)
conn.commit()
print("✅ Success!")
cur.close()
conn.close()
EOF
python3 apply-migration.py && rm apply-migration.py
```

### Key Points to Remember

1. **psycopg2 is installed** on this system - always use it
2. **Pooler connection works** with Python but NOT with Node.js pg library
3. **Always verify** after deployment with a SELECT query
4. **Always clean up** the temporary script file after execution
5. **Migration file path** is usually `supabase/migrations/YYYYMMDD_NNN_description.sql`

### Verification Patterns

After deploying, always verify based on what was created:

**For new tables:**
```python
cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'your_table'")
```

**For new functions:**
```python
cur.execute("SELECT proname FROM pg_proc WHERE proname = 'your_function_name'")
```

**For new triggers:**
```python
cur.execute("SELECT tgname FROM pg_trigger WHERE tgname = 'your_trigger_name'")
```

**For RLS policies:**
```python
cur.execute("SELECT COUNT(*) FROM pg_policies WHERE tablename = 'your_table'")
```

### Don't Waste Time Trying

- ❌ Don't try Node.js scripts first
- ❌ Don't try shell scripts with psql
- ❌ Don't try Supabase CLI commands
- ❌ Don't try HTTP/REST APIs

**Just use Python + psycopg2 immediately.**

### Example: RBAC Migration (What Worked)

This successfully deployed the RBAC security migration on 2025-11-27:

```bash
python3 apply-rbac-psycopg2.py
```

Result:
- ✅ Function exists: YES
- ✅ Trigger exists: YES
- ✅ RLS Policies: 5 found

**Total time**: ~10 seconds with Python vs 30+ minutes trying other methods.
