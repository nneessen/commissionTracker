# CONTINUATION: Trainer/Contracting Admin Feature Implementation

**Created:** 2025-12-29
**Status:** Ready to implement
**Plan File:** ~/.claude/plans/floofy-juggling-seal.md

---

## CONTEXT SUMMARY

Trainers and contracting managers need proper dashboard experience. Previous attempt broke several things.

### WHAT'S BROKEN

1. **Tucker's pipeline progress shows 0** - RecruitingTab uses `useAllUsers()` which returns basic user profiles WITHOUT joined pipeline data. The working RecruitingDashboard uses `useRecruits()` which includes JOINs for pipeline_template, recruiter, upline.

2. **Design styles wrong** - Components use CSS variables (`bg-background`, `bg-card`) instead of the codebase's zinc palette (`bg-zinc-50 dark:bg-zinc-950`, `bg-white dark:bg-zinc-900`).

3. **No Contracting Hub** - Feature doesn't exist. Needs migration + full feature build.

---

## IMPLEMENTATION ORDER

### Step 1: Fix RecruitingTab Data Source (P1)

**File:** `src/features/training-hub/components/RecruitingTab.tsx`

**Change:**
```tsx
// BEFORE (broken):
import { useAllUsers } from "@/hooks/admin/useUserApproval";
const { data: allUsers } = useAllUsers();

// AFTER (fixed):
import { useRecruits } from "@/features/recruiting/hooks/useRecruits";
const { data: recruitsData } = useRecruits(filters, page, pageSize);
const allRecruits = recruitsData?.data || [];
```

**Key:** The `useRecruits` hook returns recruits with full JOINs including `pipeline_template`, which RecruitDetailPanel needs.

---

### Step 2: Rewrite TrainerDashboard (P1)

**File:** `src/features/training-hub/components/TrainerDashboard.tsx`

**Pattern to follow (from DashboardHome.tsx):**
```tsx
<div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
  {/* Header card */}
  <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
    <div className="flex items-center gap-2">
      <GraduationCap className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
      <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Trainer Dashboard</h1>
    </div>
  </div>

  {/* Stats grid */}
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
    {/* Stat cards */}
  </div>
</div>
```

**Color Rules:**
- Page bg: `bg-zinc-50 dark:bg-zinc-950`
- Card bg: `bg-white dark:bg-zinc-900`
- Primary text: `text-zinc-900 dark:text-zinc-100`
- Secondary text: `text-zinc-500 dark:text-zinc-400`
- Borders: `border-zinc-200 dark:border-zinc-800`
- Success: `text-emerald-600 dark:text-emerald-400`
- Warning: `text-amber-600 dark:text-amber-400`
- Error: `text-red-600 dark:text-red-400`

---

### Step 3: Run Build (Verify P1)

```bash
npm run build
```

Must pass with zero errors before continuing.

---

### Step 4: Create Migration

**File:** `supabase/migrations/20251229_001_create_carrier_contracts.sql`

```sql
CREATE TABLE carrier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'terminated')),
  requested_date DATE,
  submitted_date DATE,
  approved_date DATE,
  writing_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  UNIQUE(agent_id, carrier_id)
);

ALTER TABLE carrier_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all contracts" ON carrier_contracts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_profiles WHERE id = auth.uid()
  AND (roles @> ARRAY['trainer'] OR roles @> ARRAY['contracting_manager'] OR is_admin = true)
));

CREATE POLICY "Staff can manage contracts" ON carrier_contracts FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_profiles WHERE id = auth.uid()
  AND (roles @> ARRAY['trainer'] OR roles @> ARRAY['contracting_manager'] OR is_admin = true)
));
```

---

### Step 5: Apply Migration & Regenerate Types

```bash
./scripts/apply-migration.sh supabase/migrations/20251229_001_create_carrier_contracts.sql
npx supabase gen types typescript --project-id gfmbdwptngmtnzpnrpxe > src/types/database.types.ts
```

---

### Step 6: Create Contracting Feature

**Files to create:**
```
src/features/contracting/
├── index.ts
├── ContractingPage.tsx
├── components/
│   └── ContractingDashboard.tsx
├── hooks/
│   └── useContracts.ts
└── services/
    └── contractingService.ts
```

**UI Pattern:** Match RecruitingDashboard - header card + stats row + table

---

### Step 7: Update Router

**File:** `src/router.tsx`

Add route:
```tsx
const contractingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "contracting",
  component: () => (
    <RouteGuard staffOnly allowPending>
      <ContractingPage />
    </RouteGuard>
  ),
});
```

Add to routeTree.

---

### Step 8: Update Sidebar

**File:** `src/components/layout/Sidebar.tsx`

Add to staffNavigationItems:
```tsx
{
  icon: FileCheck,
  label: "Contracting",
  href: "/contracting",
  public: true,
}
```

---

### Step 9: Final Build

```bash
npm run build
```

---

## TESTING CHECKLIST

- [ ] Login as trainer → see Dashboard, Training Hub, Contracting, Messages, Settings
- [ ] Click recruit (Tucker) in Training Hub → Sheet opens with correct phase 4 progress
- [ ] TrainerDashboard matches zinc palette styling
- [ ] Contracting page loads and shows table
- [ ] Settings shows Integrations tab
- [ ] `npm run build` passes

---

## KEY REFERENCE FILES

- `src/features/dashboard/DashboardHome.tsx` - Design pattern
- `src/features/recruiting/RecruitingDashboard.tsx` - Table + Sheet pattern
- `src/features/recruiting/hooks/useRecruits.ts` - Correct data hook
- `src/services/recruiting/repositories/RecruitRepository.ts` - Query with JOINs
- `docs/component-styling-guide.md` - CSS rules

---

## ROOT CAUSE (for context)

`RecruitDetailPanel` uses `useRecruitPhaseProgress(recruit.id)` which works fine, BUT it also tries to use `recruit.pipeline_template_id` to fetch the template. When the recruit comes from `useAllUsers()`, it has the ID but not the joined template object. When it comes from `useRecruits()`, everything is properly joined and the panel displays correctly.
