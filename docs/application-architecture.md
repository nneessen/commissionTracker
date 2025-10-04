# Application Architecture

**Commission Tracker - Insurance Sales KPI System**

---

## Purpose

Track insurance policy sales and calculate KPIs for individual insurance agents.

**Core Entity**: POLICIES
**Core Principle**: Database is single source of truth - NO LOCAL STORAGE

---

## Technology Stack

- **Frontend**: React 19.1, TypeScript, TanStack Router/Query/Form
- **UI**: shadcn, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Build**: Vite
- **Deployment**: Vercel (frontend), Supabase (database)

---

## Data Architecture

### Database Tables

**Core Tables:**
- `policies` - Source of truth for all KPIs
- `clients` - Client information (linked to policies)
- `carriers` - Insurance carriers
- `products` - Insurance products per carrier
- `commissions` - Commission records with earning tracking
- `comp_guide` - Commission rate lookup table
- `expenses` - Business expense tracking
- `chargebacks` - Chargeback records when policies lapse

**All tables:**
- Use Supabase RLS for security
- Have user_id for row-level access control
- Use UUID primary keys
- Include created_at/updated_at timestamps

### NO Local Storage Rule

❌ **Never store in:**
- localStorage
- sessionStorage
- IndexedDB
- In-memory caches that persist across renders

✅ **Only store in:**
- Supabase database (ALL business data)
- TanStack Query cache (temporary, managed automatically)
- Cookies/session storage (auth tokens, UI preferences ONLY)

---

## Application Flow

```
User Action
    ↓
React Component
    ↓
TanStack Query Hook
    ↓
Service Function
    ↓
Supabase Database
    ↓
Response flows back up
    ↓
Component Re-renders
```

**Key Points:**
- All data fetched from Supabase on page load
- TanStack Query handles caching/refetching automatically
- Forms submit directly to Supabase via services
- No data persists client-side across page refreshes

---

## Directory Structure

```
/src
  /features        - Feature modules (policies, commissions, clients, expenses)
  /services        - Business logic + Supabase queries
  /hooks           - TanStack Query hooks
  /components      - Reusable UI components
  /lib             - Utilities (calculations, formatters)
  /types           - TypeScript types (match database schema)

/supabase
  /migrations      - SQL migration files (source of truth)

/docs
  *.md             - Architecture and KPI documentation
```

---

## KPI Calculations

All KPIs derive from the `policies` table:

**Persistency**: Percentage of policies still active at milestones
- Formula: `COUNT(active AND months >= X) / COUNT(total cohort)`
- Milestones: 3mo, 6mo, 9mo, 12mo

**Average Annual Premium (AP)**:
- Formula: `AVG(annual_premium WHERE status = 'active')`

**Pace Metrics**: Policies needed per time period to hit goals
- Formula: `(annual_target - YTD_premium) / weeks_remaining / avg_AP`

**State Performance**: Metrics grouped by state
- Queries use `GROUP BY client.state`

See `kpi-definitions.md` for complete formulas.

---

## Commission Tracking

**Advance System:**
- Agent receives upfront commission advance (typically 9 months)
- Advance is earned month-by-month as client pays
- Formula: `Advance = Monthly Premium × Advance Months × Commission Rate`

**Earning Tracking:**
- `months_paid` - How many months client has paid
- `earned_amount` - Portion of advance that's earned
- `unearned_amount` - Remaining chargeback exposure

**Chargeback:**
- When policy lapses before advance fully earned
- Chargeback = Unearned Amount

See `commission-lifecycle-business-rules.md` for details.

---

## Security Model

**Row Level Security (RLS):**
- All tables have RLS enabled
- Users can only access their own data
- Filter: `user_id = auth.uid()`

**Authentication:**
- Supabase Auth handles login/signup
- JWT tokens stored in httpOnly cookies
- No manual token management needed

---

## Development Workflow

1. Create/modify schema in migration file
2. Run `npx supabase db reset` locally
3. Test with local Supabase instance
4. Commit migration file
5. Apply to production via Supabase dashboard

**Critical**: Migrations must be idempotent (can run multiple times safely)

---

## Single User Deployment

This app is designed for **individual agents**, not multi-tenant SaaS:
- No team/organization hierarchy
- No complex permission system
- One user per deployment
- Optimized for simplicity over scalability
