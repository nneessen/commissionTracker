# Commission Tracker - Application Architecture & Rules

## Application Purpose

**Insurance Sales KPI Tracking System** for individual insurance agents

- Track insurance policies (source of truth for all metrics)
- Calculate KPIs: persistency rates, avg AP, policies sold/cancelled/lapsed
- Analyze performance by state, carrier, product
- Track commission earnings and advances
- Monitor pace metrics (policies needed per period to hit goals)
- Expense tracking for business

## Critical Architecture Rules

### ZERO LOCAL STORAGE FOR APPLICATION DATA

**NEVER use:**
- localStorage
- sessionStorage
- IndexedDB
- In-memory caches that persist across page refresh

**ALWAYS use:**
- Supabase PostgreSQL database for ALL business data
- TanStack Query for temporary caching (managed automatically)
- Cookies ONLY for auth tokens

**All data must:**
- Be stored in Supabase database
- Survive page refresh
- Be fetched on component mount
- Never rely on client-side persistence

### Database is Single Source of Truth

- ALL tables in Supabase PostgreSQL
- NO local database files
- NO SQLite
- Supabase handles auth, RLS, data access
- Migrations must be idempotent and portable

## Data Model

**Core Tables:**
- `policies` - Source of truth (never deleted, status updated)
- `clients` - Client info
- `carriers` - Insurance carriers
- `products` - Products per carrier
- `commissions` - Commission tracking with earning fields
- `comp_guide` - Commission rate lookup
- `expenses` - Business expenses
- `chargebacks` - Chargeback records

**All tables have:**
- `user_id` for RLS
- UUID primary keys
- `created_at`, `updated_at` timestamps
- RLS policies enabled

## KPI Calculations

All KPIs derive from `policies` table:

**Persistency**: `COUNT(active AND months >= X) / COUNT(cohort)` at 3mo, 6mo, 9mo, 12mo
**Avg AP**: `AVG(annual_premium WHERE status='active')`
**Pace**: `(target - YTD) / weeks_remaining / avg_AP = policies_per_week_needed`
**State Performance**: `GROUP BY client.state`

## Commission System

**Advance Formula**: `Monthly Premium × Advance Months × Commission Rate`

**Earning Tracking:**
- `months_paid` - Client payment count
- `earned_amount` - Earned portion
- `unearned_amount` - Chargeback risk
- Chargeback = Unearned when policy lapses

## Tech Stack

- Frontend: React 19.1, TypeScript, TanStack (Router/Query/Form)
- UI: shadcn, Tailwind CSS v4
- Backend: Supabase (PostgreSQL + Auth + RLS)
- Build: Vite
- Single-user deployment (no multi-tenant)

## Data Flow

```
User → Component → TanStack Query Hook → Service → Supabase → Response back
```

NO local storage at any step!

## Migration Rules

**Must be:**
- Idempotent (can run multiple times)
- Portable (works on any machine)
- Use `IF NOT EXISTS` for tables/indexes
- Use DO $$ blocks for columns/policies
- PostgreSQL does NOT support `CREATE POLICY IF NOT EXISTS`
- Test with `supabase db reset` twice

**Common mistakes:**
- Using `CREATE TABLE` without IF NOT EXISTS
- Using `CREATE POLICY IF NOT EXISTS` (doesn't exist)
- Non-immutable functions in index predicates (CURRENT_DATE)
- Array slicing syntax errors
- Not testing on fresh clone

## Development Workflow

1. Modify schema in migration file
2. Run `npx supabase db reset` locally
3. Test twice (verify idempotent)
4. Test on fresh clone
5. Commit migration
6. Apply to production

## Form Auto-Calculation Issue

PolicyForm.tsx issue:
- NO editable commission percentage input field exists
- Commission % only set when product selected
- If product.commission_percentage is NULL → stays 0%
- Result: Premium × 0% = $0.00 (looks broken)

Fix: Add editable commission % field that auto-fills from product but allows manual override

## Files to Reference

- `/CLAUDE.md` - Project rules
- `/docs/application-architecture.md` - Full architecture
- `/docs/kpi-definitions.md` - All KPI formulas
- `/docs/migration-best-practices.md` - How to write migrations
- `/docs/PROGRESS.md` - Current implementation status
- `/docs/commission-lifecycle-business-rules.md` - Commission calculations

## Current Status

**Phase**: Documentation complete, ready for migration consolidation
**Next**: Archive old migrations, create single clean migration that works everywhere
**Blocker**: 21 conflicting migration files causing "works on machine A, fails on machine B"
