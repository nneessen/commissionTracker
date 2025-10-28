# Policies Table Pagination & Date Range Filtering - Implementation Kickoff

## Context

I have a comprehensive plan ready to implement server-side pagination and date range filtering for the policies table. The plan is located at `plans/ACTIVE/policies-table-pagination.md` (878 lines).

## What Needs to Be Built

### 1. Server-Side Pagination
- Fix Supabase 1000 row hard limit (currently fetching ALL policies client-side)
- Implement offset-based pagination (LIMIT/OFFSET)
- Only fetch current page (25-50 policies at a time)
- Add proper database indexes

### 2. Date Range Filtering
- Create new `DateRangePicker` component using existing shadcn Calendar
- Filter policies by effective date range
- Use existing date utilities (`parseLocalDate`, `formatDateForDB` from `src/lib/date.ts`)
- Avoid timezone bugs (major historical pain point)

### 3. Fix Metrics Summary Bar
- Current "Commission" metric is WRONG (calculates theoretical commission, not actual from database)
- Replace with 6 metrics in 2×3 grid:
  - Row 1: Total Policies, Active, Pending
  - Row 2: Annual Premium, Paid Commissions, Pending Commissions
- Add time period label: "Showing: {date range}" or "Showing: All Policies"
- All metrics must respect filters

## Critical Rules (DO NOT VIOLATE)

### File Management
- ❌ **DO NOT create new files that duplicate existing ones**
- ✅ **REFACTOR existing files, keep their names intact**
- ❌ DO NOT create `usePoliciesPaginated.ts` → refactor `usePoliciesView.ts` instead
- ❌ DO NOT create `findAllPaginated()` → refactor existing `findAll()` instead
- ✅ ONLY create 2 new files: `date-range-picker.tsx` and migration SQL

### Principles
- **KISS**: Keep it simple, don't over-engineer
- **SOLID**: Single responsibility, clean architecture
- **NO DUPLICATION**: Check before creating anything new
- **NO ASSUMPTIONS**: Read files before modifying, use existing utilities

### Date Handling (CRITICAL)
- ✅ ALWAYS use `parseLocalDate("YYYY-MM-DD")` for DB strings → Date objects
- ✅ ALWAYS use `formatDateForDB(date)` for Date objects → DB strings
- ❌ NEVER use `new Date("YYYY-MM-DD")` directly (timezone bug!)
- ❌ NEVER use `.toISOString()` for dates (timezone bug!)

## Files to Modify (7 Total)

**Refactor existing files:**
1. `src/services/policies/PolicyRepository.ts` - refactor `findAll()`, add `countFiltered()`
2. `src/services/policies/policyService.ts` - add `getPaginated()`, `getCount()`
3. `src/hooks/policies/usePoliciesView.ts` - refactor to use server-side pagination
4. `src/features/policies/hooks/usePolicySummary.ts` - fix commission calculations
5. `src/features/policies/components/PolicyDashboardHeader.tsx` - update to 6 metrics (2×3 grid)
6. `src/features/policies/PolicyList.tsx` - integrate date range filter
7. `src/types/policy.types.ts` - add `effectiveDateFrom`, `effectiveDateTo`

**Create new files:**
8. `src/components/ui/date-range-picker.tsx` - new component (doesn't exist)
9. `supabase/migrations/YYYYMMDD_NNN_add_policy_indexes.sql` - new migration

## Implementation Plan

The full plan has 10 phases across 4 weeks. Here's the order:

**Week 1: Quick Wins & Foundation**
- Phase 1: Analysis (verify current state)
- Phase 2: Database indexes
- Phase 4: Fix metrics (quick win - fixes wrong commission data)
- Phase 5: Date range picker component

**Week 2: Core Refactoring**
- Phase 3: Refactor hooks (usePoliciesView)
- Phase 6: UI integration (PolicyList.tsx)

**Week 3: Testing & Optimization**
- Phase 7: Performance optimizations
- Phase 8: Testing (especially timezone tests!)

**Week 4: Deploy**
- Phase 9: Migration & rollout
- Phase 10: Monitoring

## Start Here

**Please begin with Phase 4 (Fix Metrics)** - it's a quick win that fixes immediate bugs:

1. Read `src/features/policies/hooks/usePolicySummary.ts`
2. Read `src/features/policies/components/PolicyDashboardHeader.tsx`
3. Identify the wrong commission calculation (line 27-30 in usePolicySummary)
4. Fix it to query actual `commissions` table instead of calculating from premium × rate
5. Add "Pending Commissions" metric
6. Update header to 2×3 grid layout
7. Add time period label above metrics

**After Phase 4 is complete**, move to Phase 2 (database indexes), then Phase 5 (date picker).

## What Success Looks Like

- [ ] Policies table loads first page in <300ms (not all policies)
- [ ] Metrics show CORRECT commission data from database
- [ ] Date range picker works with proper timezone handling
- [ ] "Showing: {date range}" label displays when filters active
- [ ] All existing features preserved (row selection, bulk actions, etc.)
- [ ] No Supabase 1000 row limit errors
- [ ] Tests pass with 100% coverage on new pagination logic

## Questions to Answer

Before starting, please:
1. Read the full plan at `plans/ACTIVE/policies-table-pagination.md`
2. Confirm you understand the "no duplicate files" rule
3. Confirm you'll use existing date utilities (don't recreate them)
4. Ask if anything is unclear

## Let's Begin

Start with Phase 4 (Fix Metrics). Read the current implementation files, identify the bugs, and propose the refactoring approach before making changes.

**Remember:** Refactor existing files, don't create new versions. Keep it simple. Use existing utilities.
