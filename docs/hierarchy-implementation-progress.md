# Insurance Agency Hierarchy Implementation - Progress Report

**Status:** Phase 1 & Phase 2 Complete (Database + Backend Services)
**Date:** 2025-11-23
**Next Phase:** Phase 3 (Hooks), Phase 4 (Components), Phase 5 (Routes)

---

## ✅ COMPLETED WORK

### Phase 1: Database Migrations (100% Complete)

All 4 migrations created and ready to apply to remote Supabase:

1. **`20251123175555_add_hierarchy_to_user_profiles.sql`**
   - Added columns: `upline_id`, `hierarchy_path`, `hierarchy_depth`
   - Created triggers: `update_hierarchy_path_trigger`, `check_circular_reference_trigger`
   - Created function: `get_downline_ids(UUID)` for RLS queries
   - Initialized existing users as root agents (depth=0)
   - ✅ Does NOT touch existing user_profiles RLS policies

2. **`20251123175650_create_override_commissions_table.sql`**
   - Created `override_commissions` table with full schema
   - Indexes for performance
   - RLS policies (users see own overrides, admins see all)
   - Created `override_commission_summary` view for aggregates
   - ✅ Only triggers can INSERT (users cannot manually create overrides)

3. **`20251123175750_auto_calculate_override_commissions.sql`**
   - `create_override_commissions()` - AFTER INSERT on policies
   - Walks up ENTIRE hierarchy chain (multi-level)
   - Looks up rates from comp_guide table for each level
   - Calculates override = upline_commission - base_commission
   - `update_override_commissions_on_policy_change()` - cascades status changes
   - `update_override_earned_amount()` - helper function for earned tracking

4. **`20251123175906_update_rls_for_hierarchy.sql`**
   - Updated policies, commissions, clients RLS for hierarchical access
   - Users can VIEW own + all downlines' data
   - Users can only MODIFY their own data (not downlines')
   - ✅ Does NOT modify user_profiles approval system or is_user_approved()

**Important Files Moved to Archive:**
- `supabase/migrations/.archive/004_revert_hierarchy_system.sql`
- `supabase/migrations/.archive/005_fix_admin_user_data.sql`
- `supabase/migrations/.archive/006_fix_is_user_approved_function.sql`
- `supabase/migrations/.archive/20251121000001_revert_hierarchy_system_complete.sql`

### Phase 2: Backend Services (100% Complete)

**Type Definitions:**
- `src/types/hierarchy.types.ts` - Complete type definitions:
  - `UserProfile`, `HierarchyNode`, `OverrideCommission`
  - `OverrideSummary`, `DownlinePerformance`, `HierarchyStats`
  - `OverrideFilters`, `HierarchyChangeRequest`, `HierarchyValidationResult`

**Services:**

1. **`src/services/hierarchy/hierarchyService.ts`**
   - `getMyHierarchyTree()` - Returns tree structure with nested children
   - `getMyDownlines()` - Flat list of all downlines
   - `getMyUplineChain()` - Path from root to current user
   - `getDownlinePerformance(id)` - Full metrics for specific downline
   - `updateAgentHierarchy(request)` - Admin-only hierarchy changes
   - `validateHierarchyChange(request)` - Validation logic
   - `getMyHierarchyStats()` - Summary stats for current user
   - `buildTree()` - Private helper to build tree from flat list

2. **`src/services/overrides/overrideService.ts`**
   - `getMyOverrides(filters)` - All overrides earned by current user
   - `getMyOverrideSummary()` - Aggregate override earnings
   - `getOverridesByDownline()` - Grouped by downline agent
   - `getOverridesForPolicy(policyId)` - Override chain for specific policy
   - `updateOverrideStatus(id, status)` - Admin-only status updates
   - `recalculateOverridesForPolicy(policyId)` - Admin recalculation tool

---

## 🔄 IN PROGRESS / NOT STARTED

### Phase 3: TanStack Query Hooks (0% Complete)

**Need to create:**

1. **`src/hooks/hierarchy/useHierarchyTree.ts`**
```typescript
export function useHierarchyTree() {
  return useQuery({
    queryKey: ['hierarchy', 'tree'],
    queryFn: () => hierarchyService.getMyHierarchyTree(),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
```

2. **`src/hooks/hierarchy/useMyDownlines.ts`**
```typescript
export function useMyDownlines() {
  return useQuery({
    queryKey: ['hierarchy', 'downlines'],
    queryFn: () => hierarchyService.getMyDownlines(),
  });
}
```

3. **`src/hooks/hierarchy/useDownlinePerformance.ts`**
```typescript
export function useDownlinePerformance(downlineId: string) {
  return useQuery({
    queryKey: ['hierarchy', 'downline', downlineId, 'performance'],
    queryFn: () => hierarchyService.getDownlinePerformance(downlineId),
    enabled: !!downlineId,
  });
}
```

4. **`src/hooks/overrides/useMyOverrides.ts`**
```typescript
export function useMyOverrides(filters?: OverrideFilters) {
  return useQuery({
    queryKey: ['overrides', 'my', filters],
    queryFn: () => overrideService.getMyOverrides(filters),
  });
}
```

5. **`src/hooks/overrides/useMyOverrideSummary.ts`**
6. **`src/hooks/overrides/useOverridesByDownline.ts`**
7. **`src/hooks/hierarchy/useMyHierarchyStats.ts`**

### Phase 4: React Components (0% Complete)

**Need to create:**

1. **`src/features/hierarchy/components/HierarchyTree.tsx`**
   - Recursive tree component showing org chart
   - Expand/collapse functionality
   - Display: email, comp level, override earnings
   - Click to drill down into downline details

2. **`src/features/hierarchy/OverrideDashboard.tsx`**
   - Table of override commissions with shadcn DataTable
   - Filters: status, downline, date range, amount
   - Summary cards: Total, Pending, Earned, Paid
   - Breakdown by hierarchy level

3. **`src/features/hierarchy/DownlinePerformance.tsx`**
   - Grid/list of all downlines
   - KPI cards per downline
   - Metrics: Policies, Premium, Persistency, Commissions
   - Sort/filter capabilities

4. **`src/features/hierarchy/HierarchyManagement.tsx`** (Admin only)
   - UI to assign agents to uplines
   - Validate comp level hierarchy
   - Prevent circular references
   - Drag-and-drop optional (keep simple)

### Phase 5: Routing (0% Complete)

**Need to create routes in `src/routes/`:**

- `/hierarchy/tree` - HierarchyTree component
- `/hierarchy/overrides` - OverrideDashboard component
- `/hierarchy/downlines` - DownlinePerformance component
- `/hierarchy/downline/:id` - Individual downline dashboard
- `/hierarchy/manage` - HierarchyManagement (admin only)

**Update navigation:**
- Add "Team" tab to main navigation
- Conditional: only show if `hasDownlines || hasUpline`
- Badge showing downline count
- Quick stats in dropdown

### Phase 6: Testing (0% Complete)

1. **Database tests** - Test triggers, RLS, override calculations
2. **Integration tests** - Create test hierarchy, verify overrides
3. **Performance tests** - Benchmark recursive queries

### Phase 7: Documentation (0% Complete)

1. **`docs/hierarchy-architecture.md`** - Technical architecture
2. **`docs/override-calculation-rules.md`** - Business logic
3. **`docs/user-guide-hierarchy.md`** - User guide
4. **`docs/user-guide-overrides.md`** - Override earnings guide

---

## 🎯 CRITICAL BUSINESS LOGIC

### Override Calculation Formula

**User's Answer:** "we already calculate agents commissions so the calculation for this should be obvious. i already told you the upline gets the different between comp levels. upline has contract of 120, 1 of the uplines agents has comp of 100. thats a 20% different. its basic math"

**Implementation:**
```
1. Downline (comp_level 100) writes $10,000 premium policy
2. Lookup downline's rate in comp_guide: 100 → 0.80 (80%)
   - Downline earns: $10,000 × 0.80 = $8,000

3. Walk up hierarchy to Upline (comp_level 120)
4. Lookup upline's rate in comp_guide: 120 → 1.00 (100%)
   - Upline would earn: $10,000 × 1.00 = $10,000

5. Override = Upline commission - Downline commission
   - Override = $10,000 - $8,000 = $2,000

6. Upline earns $2,000 override (the DIFFERENCE)
```

**Multi-Level:** Entire chain earns overrides (not just immediate upline)

**Lifecycle:** Overrides follow same advance/chargeback lifecycle as base commissions

**Comp Levels:** Use existing `contractCompLevel` from `auth.users.raw_user_meta_data`

---

## 🚨 CRITICAL CONSTRAINTS

1. **DO NOT TOUCH:**
   - `is_user_approved()` function
   - User approval system
   - Admin access (nick@nickneessen.com must always work)
   - Existing user_profiles RLS policies for approval

2. **Data Source:**
   - ALL data in remote Supabase database
   - NO local storage for app data
   - NO local database testing needed
   - Use Supabase for everything

3. **Commission Rates:**
   - Rates come from existing `comp_guide` table
   - Keyed by: `carrier_id`, `product_id`, `contract_level`
   - Already structured and working

4. **RLS Security:**
   - Users can VIEW downline data (policies, commissions, clients, profiles)
   - Users can only MODIFY their own data
   - Admins bypass all restrictions

---

## 📋 NEXT STEPS FOR NEW CONVERSATION

**Prompt to use:**

```
Continue implementing the insurance agency hierarchy system.

COMPLETED:
- ✅ All 4 database migrations (ready to apply to remote Supabase)
- ✅ Type definitions (src/types/hierarchy.types.ts)
- ✅ hierarchyService (src/services/hierarchy/hierarchyService.ts)
- ✅ overrideService (src/services/overrides/overrideService.ts)

REMAINING TASKS:
1. Create TanStack Query hooks (7 hooks needed - see docs/hierarchy-implementation-progress.md)
2. Create React components (4 components - HierarchyTree, OverrideDashboard, DownlinePerformance, HierarchyManagement)
3. Create routes (/hierarchy/tree, /overrides, /downlines, /downline/:id, /manage)
4. Update main navigation to add "Team" tab (conditional on hasDownlines || hasUpline)
5. Write tests (database, integration, performance)
6. Create documentation (architecture, business rules, user guides)

CRITICAL CONTEXT:
- Read docs/hierarchy-implementation-progress.md for complete details
- Override calculation: Difference between upline and downline commission amounts (from comp_guide)
- Multi-level: Entire chain earns overrides
- Use remote Supabase only (no local db)
- DO NOT modify user approval system or is_user_approved()

Start with Phase 3: Create all TanStack Query hooks for hierarchy and overrides.
```

---

## 📁 KEY FILE LOCATIONS

**Migrations:**
- `supabase/migrations/20251123175555_add_hierarchy_to_user_profiles.sql`
- `supabase/migrations/20251123175650_create_override_commissions_table.sql`
- `supabase/migrations/20251123175750_auto_calculate_override_commissions.sql`
- `supabase/migrations/20251123175906_update_rls_for_hierarchy.sql`

**Types & Services:**
- `src/types/hierarchy.types.ts`
- `src/services/hierarchy/hierarchyService.ts`
- `src/services/overrides/overrideService.ts`

**Documentation:**
- `docs/hierarchy-implementation-progress.md` (this file)
- Project instructions: `CLAUDE.md`
- Global instructions: `~/.claude/CLAUDE.md`

---

## 💡 DESIGN PATTERNS TO FOLLOW

Look at existing patterns:
- **Services:** `src/services/policies/policyService.ts`
- **Hooks:** `src/hooks/policies/usePolicies.ts`
- **Components:** `src/features/dashboard/DashboardHome.tsx`
- **Routes:** `src/routes/`

Use shadcn components (already installed):
- DataTable for override commissions table
- Card for KPI displays
- Badge for status indicators
- Dialog for hierarchy management

---

**End of Progress Report**
