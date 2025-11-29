# Continue Reports Implementation - Next Session Prompt

**Context Remaining**: ~80K tokens
**Status**: Fixing materialized views migration - almost complete

---

## Current Situation

We're implementing Phase 1 of the comprehensive reports enhancement (plan at `/plans/reports-page-professional-redesign-plan.md`).

The materialized views migration at `supabase/migrations/20251129155721_create_reporting_materialized_views.sql` has been partially applied but has schema mismatches causing errors.

---

## Remaining Schema Fixes Needed

The migration file needs these final fixes before it will work:

### 1. Fix Commission Alias in Other Views
**Issue**: Lines using `c.commission_amount` in mv_commission_aging and mv_product_performance need to match actual schema

**Files to check/fix**:
- mv_commission_aging (around line 109): Uses `c.commission_amount` - already correct
- mv_client_ltv (around line 149): Uses `c.commission_amount` - check if alias is correct
- mv_product_performance (around line 203): Uses `c.commission_amount` - check if alias is correct

### 2. Fix JSONB Address Cast
**Issue**: Line 138: `cl.address->>'state'` causes error in SELECT, error on line 208 in GROUP BY

**Current**:
```sql
cl.address->>'state' as state,
...
GROUP BY p.user_id, p.client_id, cl.name, cl.email, (cl.address->>'state');
```

**Fix Needed**: The issue is that `address` might be stored as TEXT that contains JSON, not actual JSONB. Check:
```sql
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT pg_typeof(address) FROM clients LIMIT 1;"
```

If it's TEXT, cast it:
```sql
(cl.address::jsonb)->>'state' as state,
...
GROUP BY p.user_id, p.client_id, cl.name, cl.email, ((cl.address::jsonb)->>'state');
```

### 3. Fix Expense Date Column
**Issue**: Line 227 uses `e.expense_date` but might be wrong column name

**Check**:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name='expenses' AND column_name LIKE '%date%';
```

Results showed: `expense_date` exists, so this should be correct. But error persists. Might need to drop/recreate view.

---

## Action Plan

### Step 1: Clean Up Existing Partial Views
Before fixing migration, drop any partially-created views:

```sql
DROP MATERIALIZED VIEW IF EXISTS mv_carrier_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_commission_aging CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_client_ltv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_product_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_expense_summary CASCADE;
-- Keep these, they succeeded:
-- mv_daily_production
-- mv_cohort_retention
-- mv_production_velocity
```

### Step 2: Fix Remaining Schema Issues

1. Check `address` data type and add cast if needed
2. Verify all commission aliases (`co`, `c`, etc.) are consistent
3. Verify `expense_date` column name

### Step 3: Apply Corrected Migration

Use: `./scripts/apply-migration.sh supabase/migrations/20251129155721_create_reporting_materialized_views.sql`

### Step 4: Verify All Views Created

```sql
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\dm"
```

Should show all 8 views.

### Step 5: Test Refresh Function

```sql
SELECT refresh_all_report_materialized_views();
```

---

## Once Migration Works

1. **Update todo list** - Mark "Fix materialized views migration" as completed
2. **Begin enhancing report services** - Start with Executive Dashboard
3. **Create TypeScript types** for materialized view results

---

## Key Files

- Migration: `supabase/migrations/20251129155721_create_reporting_materialized_views.sql`
- Master plan: `/plans/reports-page-professional-redesign-plan.md`
- Session log: `/plans/reports-implementation-session-2025-11-29.md`
- This file: `/plans/continue-reports-implementation.md`
- Todo tracking: Use TodoWrite tool

---

## Database Connection

Local Supabase: `localhost:54322`
Password: `postgres`
Database: `postgres`

---

## Next Prompt

```
Continue Phase 1 implementation of reports enhancement.

Current status:
- Materialized views migration 90% complete
- Need to fix final schema issues (see /plans/continue-reports-implementation.md)
- Then proceed to enhance report generation services

Files:
- Migration: supabase/migrations/20251129155721_create_reporting_materialized_views.sql
- Session log: /plans/reports-implementation-session-2025-11-29.md
- Fix guide: /plans/continue-reports-implementation.md

Next steps:
1. Drop partially-created views (listed in fix guide)
2. Fix remaining schema issues (address cast, verify aliases)
3. Apply corrected migration with ./scripts/apply-migration.sh
4. Verify all 8 views created
5. Begin enhancing report services
```

---

**Created**: 2025-11-29
**Status**: Ready to continue
