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
- Track commission earnings and advances
- Monitor pace metrics (policies needed per day/week/month to hit goals)
- Expense tracking for business operations

**Core Entity:** POLICIES - Everything derives from policy data
**Target User:** Individual insurance agents (single-user deployment)
**Design Principles:** Low concurrency, low cost, strong data safety, real-time KPI calculations

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
- Drives all KPI calculations
- Never deleted, only status updated (active → lapsed → cancelled)

**Key Metrics Calculated from Policies:**
- **Persistency**: `COUNT(WHERE status='active' AND months_since_start >= X) / COUNT(total in cohort)`
- **Avg AP**: `AVG(annual_premium WHERE status='active')`
- **Pace Metrics**: `(annual_target - YTD_premium) / weeks_remaining / avg_AP = policies_per_week_needed`
- **State Performance**: `GROUP BY client_state → SUM(annual_premium), COUNT(*), AVG(annual_premium)`

See `/docs/kpi-definitions.md` for complete formulas.

---
