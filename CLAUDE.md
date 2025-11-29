# CLAUDE.md

Purpose: guidance for Claude Code (claude.ai/code) and human contributors working on this repository.
Target app: small-scale personal + business expense tracker. React 19.1, TypeScript, Supabase/Postgres.

---

# Project summary

**Insurance Sales KPI Tracking System**

This is a full-stack application for insurance sales agents to track Key Performance Indicators (KPIs) based on policy data.

**Core Purpose:**

- Track insurance policies (the source of truth for all metrics)
- Calculate KPIs: persistency rates, average annual premium (AP), policies sold/cancelled/lapsed
- Analyze performance by state, carrier, product type
- Track commission earnings with contract-level calculations
- Monitor advances and splits with upline agents
- Monitor pace metrics (policies needed per day/week/month to hit goals)
- Expense tracking for business operations with categories and reports
- Advanced time period filtering (MTD, YTD, Last 30/60/90 days, custom ranges)

**Core Entity:** POLICIES - Everything derives from policy data
**Target User:** Individual insurance agents (single-user deployment)
**Design Principles:** Low concurrency, low cost, strong data safety, real-time KPI calculations

**Recent Major Features (as of Oct 2025):**

- ✅ Contract-level commission system with automatic calculations
- ✅ Redesigned data-dense dashboard with quick actions
- ✅ Multiple dashboard layouts (standard, compact, terminal/console)
- ✅ Time period filtering across all views
- ✅ Commission management grid with splits and advances
- ✅ Expense categories and reporting system

---

# Stack (explicit)

- Frontend: React 19.1 + TypeScript
- Routing: TanStack Router (latest)
- Data fetching: TanStack Query (latest)
- Forms: TanStack Form (latest)
- UI: shadcn + Tailwind CSS v4
- Build: Vite
- Backend / DB: Supabase (Postgres). Use Supabase Edge Functions / serverless for server-side logic.
- Hosting: Vercel or Railway for frontend. Supabase managed Postgres for DB. Use AWS/GCP for optional services.
- Language for backend jobs: Python (optional workers/scripts)
- Devops: GitHub Actions for CI, migrations via supabase / pg-migrate

---

# Goals and constraints

- Target users: individual / small teams. Not enterprise scale.
- Prioritize correctness, privacy, predictable costs.
- Minimal latency. No unnecessary microservices.
- Prefer simple, observable, and reversible changes.

---

# Project rules (must-follow)

## Critical Architecture Rules

**ZERO LOCAL STORAGE FOR APPLICATION DATA**

- ❌ NEVER use localStorage, sessionStorage, or IndexedDB for policy, commission, client, or any business data
- ✅ ALWAYS use Supabase database for ALL data persistence
- ✅ Local storage ONLY for: cookies, session tokens, UI preferences (theme, sidebar state)
- ✅ All data must survive page refresh by fetching from Supabase
- ❌ NO in-memory caches that would cause data to disappear on refresh
- ✅ Use TanStack Query for server state management (it handles caching properly)

**Database is Single Source of Truth**

- ALL application data lives in Supabase PostgreSQL database
- Migrations must work on any machine, any time, idempotently
- No local database files or SQLite
- Supabase handles auth, RLS, and all data access

## Database Migration Rules

**CRITICAL: There is ONLY ONE migration directory - `supabase/migrations/`**

**Migration Best Practices:**

- ✅ ALL migrations go in `supabase/migrations/` ONLY
- ✅ Use Supabase CLI to create migrations: `supabase migration new <name>`
- ✅ Migration naming: `YYYYMMDD_NNN_descriptive_name.sql` (e.g., `20251005_001_add_user_preferences.sql`)
- ✅ Test migrations locally before applying to production
- ✅ Migrations must be idempotent (safe to run multiple times)
- ✅ Use transactions for multi-step migrations
- ❌ NEVER create duplicate migration directories (no `database/`, `db/`, etc.)
- ❌ NEVER use file extensions like `.OLD`, `.backup`, `.temp` - delete old files or move to `/archive`
- ❌ NEVER manually edit the schema without creating a migration
- ❌ NEVER commit migrations that haven't been tested locally

**Migration Workflow:**

1. Create migration: `supabase migration new add_feature_x`
2. Write SQL in generated file: `supabase/migrations/YYYYMMDD_NNN_add_feature_x.sql`
3. Test locally: `supabase db reset` (applies all migrations)
4. Verify changes: Connect to local DB and test
5. Commit migration file to git
6. Apply to production: Supabase auto-applies on git push OR manual `supabase db push`

**Common Migration Commands:**

- `supabase migration list` - View migration status
- `supabase migration new <name>` - Create new migration
- `supabase db reset` - Reset local DB and apply all migrations
- `supabase db push` - Push migrations to remote (if not auto-deployed)

**Before Creating Migrations, Always:**

1. Check `supabase/migrations/` for existing migrations
2. Verify no duplicate directories exist (`database/`, `db/`, etc.)
3. Use `git status` to see if migrations are already in progress

**CRITICAL: Debugging Database Trigger Conflicts**

If you encounter errors like "record 'v_commission' has no field 'commission_amount'":

1. **Check for duplicate triggers** (multiple triggers on same table for same event):

   ```sql
   SELECT trigger_name, event_object_table, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table IN ('policies', 'commissions')
   ORDER BY event_object_table, trigger_name;
   ```

2. **Find functions with wrong field references**:

   ```sql
   SELECT proname, prosrc
   FROM pg_proc
   WHERE prosrc LIKE '%commission_amount%'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
   ```

3. **Identify the OLD broken function** - It will reference non-existent field names like `commission_amount` or `advance_amount`

4. **Remove only the OLD one** (keep the newer, corrected version):

   ```sql
   DROP TRIGGER IF EXISTS old_trigger_name ON table_name;
   DROP FUNCTION IF EXISTS old_function_name();
   ```

5. **Verify correct field names** in commissions table are:
   - `amount` (NOT commission_amount, NOT advance_amount)
   - `advance_months`, `months_paid`, `earned_amount`, `unearned_amount`, `chargeback_amount`, `status`

**Root Cause**: Old migrations create functions with wrong field names, new migrations create corrected versions, but BOTH exist in database. The OLD one executes FIRST and fails, blocking the corrected one. Solution: DELETE the old broken function and trigger, keep only the corrected version.

## Database Constraint Philosophy

**CRITICAL: DO NOT create enum-style CHECK constraints on TEXT fields**

❌ **BAD** (rigid, requires migration to add values):
```sql
ALTER TABLE foo ADD COLUMN status TEXT CHECK (status IN ('active', 'inactive'));
```

✅ **GOOD** (flexible, validation in TypeScript):
```sql
ALTER TABLE foo ADD COLUMN status TEXT; -- Validated at application layer
```

**When to use database constraints:**

- ✅ **Foreign keys** - Referential integrity (e.g., `REFERENCES user_profiles(id)`)
- ✅ **NOT NULL** - Required fields
- ✅ **UNIQUE** - Prevent duplicates
- ✅ **Numeric ranges** - Business rules (e.g., `contract_level BETWEEN 80 AND 145`)
- ✅ **Non-negative amounts** - Mathematical validity (e.g., `amount >= 0`)
- ✅ **Self-reference prevention** - Logical impossibility (e.g., `recruiter_id != id`)

**When NOT to use database constraints:**

- ❌ **Enum-style TEXT validation** - Use TypeScript types instead
- ❌ **Pattern matching** - Email/phone formats (use TypeScript)
- ❌ **Business logic** - Anything that may evolve (use TypeScript)
- ❌ **Role/status/type arrays** - Hardcoded values that will change

**Why?**

TypeScript provides:
- ✅ Compile-time type safety
- ✅ Runtime flexibility (add new values without migrations)
- ✅ Better IDE support
- ✅ Easier to test and maintain
- ✅ Single source of truth (types in `/src/types/`)

Database constraints provide:
- ❌ Friction when adding new enum values
- ❌ Requires migrations for simple changes
- ❌ Duplicates validation already in TypeScript
- ❌ No value in single-user application

**Migration 20251129001407**: Removed all enum-style constraints. Validation now handled exclusively at TypeScript layer.

## Code Quality Rules

- TypeScript strict mode on.
- Keep naming conventional. Component names PascalCase. Files kebab-case. Function names camelCase. Do not invent fanciful class/file names like `ImprovedSidebar`.
- Prefer composition over large HOCs.
- Avoid `useCallback` / `useMemo` by default. Only introduce them when profiling shows measurable benefit.
- Never commit secrets. Use `.env.example`.
- Do not use transient mock data in production code. Use seeded fixtures for local dev and tests.
- Each PR must include tests for any new business logic or SQL migrations.

---

# High-level architecture

- `/src/features/*` — feature folders by domain (policies, commissions, clients, expenses, reports, auth)
- `/src/components/*` — reusable UI primitives
- `/src/routes/*` — route components & loaders (TanStack Router)
- `/src/services/*` — business logic and Supabase data access (NO local storage!)
- `/src/hooks/*` — TanStack Query hooks for server state
- `/src/lib/*` — app-wide utilities (date, currency, calculations)
- `/src/types/*` — TypeScript types matching database schema
- `/supabase/migrations/*` — SQL migrations (single source of truth for schema)
- `/docs/*` — Architecture, KPI definitions, migration guides

**Data Flow:**

1. User interacts with React components
2. Components use TanStack Query hooks
3. Hooks call service functions
4. Services query Supabase database
5. Data flows back through hooks to components
6. **NO local storage at any step**

Keep features self-contained. Each feature should export:

- React routes and route loader functions
- TanStack Query keys and hooks
- Service functions for business logic
- Tests and stories

---

# KPI Data Model

**Policies Table** (Source of Truth):

- Contains: client info, carrier, product, premium, status, dates
- Links to contract-level commission settings
- Drives all KPI calculations
- Never deleted, only status updated (active → lapsed → cancelled)

**Commission System** (Contract-Level):

- **Commission Settings**: Stored at contract level (carrier + product + contract_level)
- **Automatic Calculation**: Commissions auto-calculated when policies are added
- **Split Management**: Track splits with upline agents (percentage based)
- **Advance Tracking**: Monitor advances and chargebacks
- **Time Period Filters**: MTD, YTD, Last 30/60/90 days, custom ranges

**Key Metrics Calculated from Policies:**

- **Persistency**: `COUNT(WHERE status='active' AND months_since_start >= X) / COUNT(total in cohort)`
- **Avg AP**: `AVG(annual_premium WHERE status='active')`
- **Pace Metrics**: `(annual_target - YTD_premium) / weeks_remaining / avg_AP = policies_per_week_needed`
- **State Performance**: `GROUP BY client_state → SUM(annual_premium), COUNT(*), AVG(annual_premium)`
- **Commission Performance**: Total earned, advances outstanding, splits paid

See `/docs/kpi-definitions.md` for complete formulas and `/docs/commission-lifecycle-business-rules.md` for commission rules.

---

GOLDEN RULES TO NEVER BREAK

- when working on plans, do not forget to update them as you go and when completed, change the name to match the other files names and move to plans/completed/
- always fetch my current db schema from my remote supabase before every new task
- DO NOT PUT ANY additional .md files in the root of this project. i do not care what the file is. i have a docs/ and a plans/ directory for a reason. i want to stay organized.
- add to memory. stop asking me to continue working on anything that is still incomplete. if there already is a comprehensive plan typed up that you can keep track of whats been completed and what hasn't, then if its not completed, you don't need to keep asking me to continue. continue until its complete, and when context gets to 10% remaining, write a prompt that i can copy/paste into a new conversation to continue where we left off
- add to memory. no fake/mock/placeholder period anywhere in this application. do not put in any ui features that don't actually do anything. it makes things confusing.