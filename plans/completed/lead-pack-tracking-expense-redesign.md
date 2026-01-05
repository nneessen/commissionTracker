# Life Insurance Lead Pack Tracking + Expense Category Redesign

## Executive Summary

This plan addresses two related issues:
1. **New Feature**: Life Insurance Lead Pack tracking with ROI analytics
2. **Technical Debt**: Fix the poorly designed `expense_categories` table that creates duplicate rows per user

**Critical Constraint**: App is live with real user data. All migrations must preserve existing expense records.

---

## Part 1: Current State Analysis

### Problem 1: expense_categories Table Design Flaw

**Current Schema:**
```sql
expense_categories (
  id uuid,
  user_id uuid,        -- ← Every user gets their own copy
  name varchar,
  description text,
  is_active boolean,
  sort_order integer,
  created_at, updated_at
)
```

**Issues Identified:**
1. **Data Duplication**: If there are 20 default categories and 100 users = 2,000 rows
2. **UI Disconnect**: The UI components (`ExpenseDialogCompact`, `ExpenseDashboardCompact`) use `DEFAULT_EXPENSE_CATEGORIES` TypeScript constant, NOT the database table
3. **No Foreign Key**: The `expenses.category` field is a plain STRING, not a FK to `expense_categories`
4. **Wasted Storage & Queries**: The `expense_categories` table is essentially unused in core flows
5. **initializeDefaults()**: Creates 20+ rows per new user unnecessarily

**Current expense.category usage:**
- `expenses.category` = plain text string (e.g., "Office Supplies")
- UI dropdowns render from `DEFAULT_EXPENSE_CATEGORIES` TypeScript array
- No referential integrity between expenses and expense_categories

### Problem 2: Missing Lead Pack Tracking

Life insurance agents purchase "lead packs" from various vendors. Currently:
- No way to track vendor information
- No way to record # of leads per purchase
- No cost-per-lead calculation
- No ROI tracking (leads → policies → commissions)
- The existing `recruiting_leads` table is for agent recruitment, not client leads

---

## Part 2: Proposed Solution Architecture

### 2.1 Expense Categories Redesign

**New Architecture:**

```
global_expense_categories (system-defined, read-only for users)
  ├── Office Supplies
  ├── Travel
  ├── Life Insurance Leads  ← NEW
  └── ... (all current defaults)

user_expense_categories (user-created custom categories)
  ├── user_id
  ├── name
  └── ... (user additions only)
```

**Migration Strategy (Data Preservation):**
1. Create new `global_expense_categories` table with all default categories
2. Rename existing `expense_categories` → `user_expense_categories`
3. Delete rows from `user_expense_categories` WHERE name matches any global category
4. Keep only user-created custom categories in `user_expense_categories`
5. Update UI to query UNION of global + user categories
6. `expenses.category` remains a STRING (no FK) - this is intentional for flexibility

### 2.2 Lead Pack Tracking System

**New Tables:**

```sql
-- Vendor management
lead_vendors (
  id uuid PRIMARY KEY,
  user_id uuid,           -- Owner (who added this vendor)
  imo_id uuid,            -- Org visibility
  name varchar NOT NULL,  -- "LeadGenPro", "InsuranceLeads.com"
  contact_name varchar,
  contact_email varchar,
  contact_phone varchar,
  website varchar,
  notes text,
  is_active boolean DEFAULT true,
  created_at, updated_at
)

-- Lead pack purchases
lead_packs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  imo_id uuid,
  agency_id uuid,
  vendor_id uuid REFERENCES lead_vendors(id),
  expense_id uuid REFERENCES expenses(id),  -- Links to expense record

  -- Pack details
  pack_name varchar,          -- "March 2024 Exclusive Pack"
  pack_type varchar NOT NULL, -- 'exclusive', 'shared', 'aged', 'telemarketed', 'direct_mail'
  lead_count integer NOT NULL,
  total_cost numeric(10,2) NOT NULL,
  cost_per_lead numeric(10,2) GENERATED ALWAYS AS (total_cost / NULLIF(lead_count, 0)) STORED,

  -- Dates
  purchase_date date NOT NULL,
  leads_received_date date,

  -- Tracking
  leads_worked integer DEFAULT 0,
  leads_contacted integer DEFAULT 0,
  leads_quoted integer DEFAULT 0,
  leads_sold integer DEFAULT 0,

  -- ROI (calculated)
  total_commission_generated numeric(10,2) DEFAULT 0,
  roi_percentage numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_cost > 0
    THEN ((total_commission_generated - total_cost) / total_cost) * 100
    ELSE 0 END
  ) STORED,

  notes text,
  created_at, updated_at
)

-- Individual leads from packs (optional granular tracking)
client_leads (
  id uuid PRIMARY KEY,
  lead_pack_id uuid REFERENCES lead_packs(id),
  user_id uuid NOT NULL,

  -- Lead info
  first_name varchar,
  last_name varchar,
  phone varchar,
  email varchar,
  city varchar,
  state varchar(2),
  zip varchar(10),
  age integer,

  -- Status workflow
  status varchar DEFAULT 'new',  -- 'new', 'contacted', 'quoted', 'sold', 'dead', 'bad_info'
  contacted_at timestamptz,
  quoted_at timestamptz,
  sold_at timestamptz,

  -- Conversion tracking
  policy_id uuid REFERENCES policies(id),  -- Links to sale if converted
  premium_amount numeric(10,2),            -- If sold
  commission_amount numeric(10,2),         -- If sold

  notes text,
  created_at, updated_at
)
```

### 2.3 Expense Table Enhancement

**Add FK to expenses:**
```sql
ALTER TABLE expenses ADD COLUMN lead_pack_id uuid REFERENCES lead_packs(id);
```

When `category = 'Life Insurance Leads'`, the expense can optionally link to a lead_pack record for detailed tracking.

---

## Part 3: Implementation Phases

### Phase 1: Database Schema (Migration)

**File**: `supabase/migrations/YYYYMMDD_XXX_expense_categories_redesign.sql`

1. Create `global_expense_categories` table
2. Seed with all default categories including "Life Insurance Leads"
3. Rename `expense_categories` → `user_expense_categories`
4. Clean up duplicate/default categories from user table
5. Add composite unique constraint on user_expense_categories

**File**: `supabase/migrations/YYYYMMDD_XXX_lead_pack_tracking.sql`

1. Create `lead_vendors` table with RLS policies
2. Create `lead_packs` table with computed columns + RLS
3. Create `client_leads` table with RLS
4. Add `lead_pack_id` FK to `expenses` table
5. Create helper functions for ROI calculations

### Phase 2: Service Layer

**New Services:**
- `leadVendorService.ts` - Vendor CRUD
- `leadPackService.ts` - Lead pack CRUD + ROI calculations
- `clientLeadService.ts` - Individual lead tracking

**Modified Services:**
- `expenseCategoryService.ts` - Query global + user categories combined
- `expenseService.ts` - Handle lead_pack_id linking

### Phase 3: Type Definitions

**Update `expense.types.ts`:**
- Add `LeadVendor`, `LeadPack`, `ClientLead` types
- Add pack types enum: `'exclusive' | 'shared' | 'aged' | 'telemarketed' | 'direct_mail'`
- Add lead status enum: `'new' | 'contacted' | 'quoted' | 'sold' | 'dead' | 'bad_info'`

**Regenerate `database.types.ts`** after migration.

### Phase 4: UI Components

**New Components:**
```
src/features/expenses/
  └── leads/
      ├── LeadPackDashboard.tsx      -- Overview of all lead packs
      ├── LeadPackDialog.tsx         -- Create/edit lead pack
      ├── LeadPackDetail.tsx         -- Single pack view with leads
      ├── LeadVendorManager.tsx      -- Vendor CRUD
      ├── ClientLeadTable.tsx        -- Lead list with status updates
      ├── LeadROIChart.tsx           -- ROI visualization
      └── LeadConversionFunnel.tsx   -- Funnel chart
```

**Modified Components:**
- `ExpenseDialogCompact.tsx` - When category is "Life Insurance Leads", show lead pack linking
- `ExpenseDashboardCompact.tsx` - Add section for lead pack ROI overview
- Category dropdowns - Fetch from combined global + user categories

### Phase 5: Analytics & Reporting

**Metrics to track:**
1. **Per Lead Pack:**
   - Cost per lead
   - Conversion rate (leads → sales)
   - ROI percentage
   - Revenue per lead

2. **Per Vendor:**
   - Total spent
   - Average cost per lead
   - Overall conversion rate
   - Vendor ROI ranking

3. **Time-based:**
   - Month-over-month lead spend
   - Seasonal patterns
   - Best performing months

---

## Part 4: Data Migration Script (Critical)

```sql
-- PRESERVE ALL EXISTING EXPENSE DATA
-- This migration only adds new capabilities, never deletes expense records

-- Step 1: Create global categories (insert only, no data touched)
CREATE TABLE global_expense_categories (...);
INSERT INTO global_expense_categories (name, description, category_type, sort_order) VALUES
  ('Office Supplies', 'Pens, paper, printer ink, etc.', 'business', 0),
  -- ... all existing defaults ...
  ('Life Insurance Leads', 'Lead packs purchased from vendors', 'business', 11);  -- NEW

-- Step 2: Rename user table (no data loss)
ALTER TABLE expense_categories RENAME TO user_expense_categories;

-- Step 3: Remove duplicates from user table (keeps custom categories)
DELETE FROM user_expense_categories
WHERE name IN (SELECT name FROM global_expense_categories);

-- Step 4: Add new column to expenses (nullable, no data touched)
ALTER TABLE expenses ADD COLUMN lead_pack_id uuid REFERENCES lead_packs(id);

-- VERIFICATION: Count expenses before and after - should be identical
SELECT COUNT(*) FROM expenses; -- Must match after migration
```

---

## Part 5: Rollback Plan

**Revert Script**: `supabase/migrations/reverts/expense_categories_redesign_revert.sql`

```sql
-- Step 1: Drop FK from expenses (no data loss)
ALTER TABLE expenses DROP COLUMN IF EXISTS lead_pack_id;

-- Step 2: Rename back
ALTER TABLE user_expense_categories RENAME TO expense_categories;

-- Step 3: Re-insert global categories for each user
-- (Would need to regenerate, loss of sort_order customizations)

-- Step 4: Drop new tables
DROP TABLE IF EXISTS client_leads;
DROP TABLE IF EXISTS lead_packs;
DROP TABLE IF EXISTS lead_vendors;
DROP TABLE IF EXISTS global_expense_categories;
```

---

## Part 6: Testing Checklist

- [ ] Existing expenses display correctly after migration
- [ ] Category dropdowns show all global + user categories
- [ ] New "Life Insurance Leads" category appears
- [ ] Can create lead vendor
- [ ] Can create lead pack linked to expense
- [ ] ROI calculations work correctly
- [ ] Lead status workflow works
- [ ] Policy linking to lead works
- [ ] RLS policies enforce proper visibility
- [ ] Downline expense visibility still works
- [ ] Build passes with zero TypeScript errors

---

## Part 7: Files to Create/Modify

### New Files:
1. `supabase/migrations/YYYYMMDD_XXX_expense_categories_redesign.sql`
2. `supabase/migrations/YYYYMMDD_XXX_lead_pack_tracking.sql`
3. `src/services/leads/leadVendorService.ts`
4. `src/services/leads/leadPackService.ts`
5. `src/services/leads/clientLeadService.ts`
6. `src/types/lead.types.ts`
7. `src/hooks/leads/useLeadPacks.ts`
8. `src/hooks/leads/useLeadVendors.ts`
9. `src/hooks/leads/useClientLeads.ts`
10. `src/features/expenses/leads/` (all components)

### Modified Files:
1. `src/types/database.types.ts` (regenerated)
2. `src/types/expense.types.ts` (add types)
3. `src/services/expenses/categories/ExpenseCategoryService.ts`
4. `src/features/expenses/components/ExpenseDialogCompact.tsx`
5. `src/features/expenses/ExpenseDashboardCompact.tsx`

---

## Questions Before Implementation

1. **Pack Types**: Are these correct? `exclusive`, `shared`, `aged`, `telemarketed`, `direct_mail`
2. **Lead Fields**: What info do lead vendors typically provide? (name, phone, email, address, age, etc.)
3. **Team Visibility**: Should managers see their downline's lead pack data?
4. **Integration**: Should ROI appear on the main dashboard or only in expenses section?
5. **Granularity**: Do you want to track individual leads, or just pack-level stats?

---

## Estimated Work

- Phase 1 (DB Migration): 1 session
- Phase 2 (Services): 1 session
- Phase 3 (Types): Part of Phase 2
- Phase 4 (UI): 2-3 sessions
- Phase 5 (Analytics): 1 session
- Testing: Ongoing

**Total**: 5-6 development sessions
