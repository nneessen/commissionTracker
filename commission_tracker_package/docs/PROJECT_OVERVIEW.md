# Commission Tracker - Project Overview

## Executive Summary

**Application Type:** Insurance Sales KPI Tracking System
**Target User:** Individual insurance agents (single-user deployment)
**Core Purpose:** Track policies, calculate commissions, monitor KPIs, and manage business expenses

## Project Goals

This application is designed to help insurance sales agents:

1. **Track Policy Performance** - Monitor all insurance policies (active, lapsed, cancelled)
2. **Calculate Commissions** - Automatically calculate earned vs unearned commissions based on contract terms
3. **Monitor KPIs** - Track key performance indicators like persistency rates, average premium, retention
4. **Manage Expenses** - Track business expenses and calculate profit/loss
5. **Pace Tracking** - Calculate how many policies needed per day/week/month to hit targets
6. **Time Period Analysis** - Filter all metrics by daily, weekly, monthly, or yearly time periods

## Technology Stack

### Frontend
- **React 19.1** with TypeScript
- **TanStack Router** (latest) - File-based routing
- **TanStack Query** (latest) - Server state management
- **TanStack Form** (latest) - Form handling
- **shadcn/ui + Tailwind CSS v4** - UI components and styling
- **Vite** - Build tool

### Backend
- **Supabase** (Managed PostgreSQL)
- **Row Level Security (RLS)** - All queries filtered by authenticated user
- **Database Triggers** - Automatic commission calculations
- **Edge Functions** - Server-side logic (optional)

### Hosting
- **Vercel/Railway** - Frontend hosting
- **Supabase** - Managed database
- **GitHub Actions** - CI/CD

## Core Architecture Principles

### 1. Database as Single Source of Truth
- **NO local storage for application data** (policies, commissions, expenses)
- localStorage ONLY for: auth tokens, UI preferences (theme, sidebar state)
- All data must survive page refresh by fetching from Supabase
- TanStack Query manages server state caching (proper way)

### 2. User-Scoped Data (RLS)
- Every table has `user_id` column
- Row Level Security enforces user-only access
- No user can see another user's data
- Single-user deployment per agent

### 3. Idempotent Migrations
- All migrations in `supabase/migrations/` directory ONLY
- Named: `YYYYMMDD_NNN_descriptive_name.sql`
- Must be safe to run multiple times
- Test locally before production

### 4. Automatic Calculations
- Commission calculations happen in database triggers
- Earned amount auto-calculated based on `months_paid` field
- Unearned amount = Total - Earned
- Frontend displays calculated values, doesn't recalculate

## Data Model Overview

### Core Entity: POLICIES
Everything derives from policy data. Policies are NEVER deleted, only status updated.

**Policy Statuses:**
- `active` - Currently in force
- `lapsed` - Missed payments, may reinstate
- `cancelled` - Permanently terminated
- `pending` - Application submitted, not yet approved

### Key Relationships

```
POLICIES (source of truth)
  ├─→ CLIENTS (one-to-many: client can have multiple policies)
  ├─→ CARRIERS (many-to-one: all policies belong to a carrier)
  ├─→ PRODUCTS (many-to-one: references product table)
  └─→ COMMISSIONS (one-to-one: auto-created on policy insert)

COMMISSIONS
  ├─→ POLICIES (foreign key: policy_id)
  ├─→ COMP_GUIDE (lookup: determines commission rate by contract level)
  └─→ CHARGEBACKS (one-to-many: tracks commission clawbacks)

EXPENSES
  ├─→ EXPENSE_CATEGORIES (many-to-one)
  └─→ USER (filtered by user_id via RLS)
```

## Current Implementation Status

### ✅ What Works
- Policy CRUD operations
- Commission auto-creation via database trigger
- Expense tracking with categories
- Basic KPI dashboard with time period filtering
- Contract-level commission rates (comp_guide table)
- Earned/unearned commission calculations in database
- Row Level Security for all tables

### ⚠️ Critical Issues Identified

1. **Time Period Scaling Bug**
   - Changing time period (monthly → weekly) shows same raw values
   - No proper scaling/division of metrics
   - Example: $4,000 monthly expense should show as ~$923/week, not $4,000

2. **Incorrect Commission Field Usage**
   - Frontend uses `advanceAmount` instead of `amount`
   - Doesn't utilize `earned_amount` and `unearned_amount` from database
   - Commission tracking inconsistent

3. **Missing Critical KPIs**
   - No Customer Acquisition Cost (CAC)
   - No Lifetime Value (LTV) calculations
   - No persistency cohort analysis
   - No sales funnel metrics
   - No productivity tracking

4. **Data Duplication in Dashboard**
   - Same metrics displayed multiple times in different formats
   - No clear information hierarchy
   - Confusing for users

## Directory Structure

```
commissionTracker/
├── src/
│   ├── features/           # Feature-based organization
│   │   ├── policies/       # Policy management
│   │   ├── commissions/    # Commission tracking
│   │   ├── expenses/       # Expense management
│   │   ├── dashboard/      # Main dashboard
│   │   └── analytics/      # Analytics & reports
│   ├── services/           # Business logic & data access
│   │   ├── policies/       # Policy service & repository
│   │   ├── commissions/    # Commission calculations
│   │   └── expenses/       # Expense service
│   ├── hooks/              # TanStack Query hooks
│   │   ├── policies/       # Policy hooks
│   │   ├── commissions/    # Commission hooks
│   │   └── expenses/       # Expense hooks
│   ├── types/              # TypeScript type definitions
│   ├── components/         # Reusable UI components
│   ├── utils/              # Utility functions
│   └── lib/                # Third-party lib configs
├── supabase/
│   └── migrations/         # SQL migration files (ONLY location)
└── docs/                   # Documentation
```

## Key Files for Commission/Policy System

### Database Layer
- `supabase/migrations/*.sql` - All schema definitions and migrations
- Database triggers: `update_commission_earned_amounts`, `auto_create_commission_record`
- Database functions: `calculate_earned_amount`

### Service Layer (Business Logic)
- `src/services/policies/policyService.ts` - Policy CRUD operations
- `src/services/policies/PolicyRepository.ts` - Data access layer
- `src/services/commissions/CommissionCalculationService.ts` - Commission math
- `src/services/commissions/CommissionLifecycleService.ts` - Commission workflow
- `src/services/commissions/commissionService.ts` - Main commission service

### Hooks Layer (State Management)
- `src/hooks/useMetricsWithDateRange.ts` - **CRITICAL** - All KPI calculations
- `src/hooks/policies/usePolicies.ts` - Fetch all policies
- `src/hooks/commissions/useCommissions.ts` - Fetch all commissions
- `src/hooks/expenses/useExpenses.ts` - Fetch all expenses

### Type Definitions
- `src/types/policy.types.ts` - Policy types
- `src/types/commission.types.ts` - Commission types
- `src/types/expense.types.ts` - Expense types
- `src/types/database.types.ts` - Database schema types

### UI Layer
- `src/features/dashboard/DashboardHome.tsx` - Main KPI dashboard
- `src/features/policies/PolicyDashboard.tsx` - Policy management
- `src/components/ui/MetricTooltip.tsx` - KPI tooltips with formulas

## Data Flow Example: Creating a Policy

1. User fills out `PolicyForm.tsx`
2. Form calls `handleAddPolicy()` → creates client if needed
3. Calls `createPolicy.mutateAsync()` (TanStack Query mutation)
4. Mutation calls `policyService.create()`
5. Service inserts into `policies` table via Supabase client
6. **Database trigger fires:** `trigger_auto_create_commission`
7. Trigger creates commission record in `commissions` table
8. Another trigger fires: `trigger_update_commission_earned`
9. Calculates `earned_amount` and `unearned_amount` using database function
10. TanStack Query invalidates cache, refetches policies
11. Dashboard updates with new policy and commission

**NO local storage involved at any step!**

## Authentication Flow

1. User logs in via Supabase Auth
2. JWT token stored in browser cookie
3. All API calls include auth token
4. Row Level Security filters data by `user_id`
5. Frontend uses `useAuth()` hook to access current user

## Configuration Files

- `.env` - Environment variables (Supabase URL, anon key)
- `tailwind.config.js` - Tailwind CSS configuration
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript compiler options

## Testing Strategy

- Unit tests for calculation utilities
- Integration tests for hooks
- E2E tests for critical flows (policy creation, commission calculation)
- Database migration testing locally before production

## Deployment Process

1. **Local Development:**
   - `supabase start` - Start local Supabase
   - `npm run dev` - Start Vite dev server

2. **Database Changes:**
   - `supabase migration new <name>` - Create migration
   - `supabase db reset` - Test locally
   - Commit migration file

3. **Deploy:**
   - Push to GitHub
   - Vercel auto-deploys frontend
   - Supabase auto-applies migrations (or manual `supabase db push`)

## Common Pitfalls to Avoid

1. **Don't use localStorage for data** - Only for UI preferences
2. **Don't duplicate migration directories** - Only `supabase/migrations/`
3. **Don't bypass RLS** - Always use authenticated Supabase client
4. **Don't recalculate commissions in frontend** - Trust database values
5. **Don't create policies without clients** - Always create/find client first

## Next Steps for Improvement

See `CURRENT_ISSUES.md` and `KPI_FORMULAS.md` for detailed improvement plan.
