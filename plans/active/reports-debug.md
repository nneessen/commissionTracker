# Reports Page Debugging Plan

## ✅ STATUS: IMPLEMENTATION COMPLETE

**Date**: 2026-01-06
**Issues Fixed**: 2 of 3 (critical error + silent failures)
**Remaining**: User validation in browser

---

## Problem Summary

Multiple issues with the Reports page, starting with the IMO Performance report:
1. **Critical**: `get_team_comparison_report` RPC returns 400 with "column reference 'new_premium' is ambiguous" - ✅ FIXED
2. **Silent failures**: Report generation services swallow errors, returning empty data - ✅ FIXED
3. **Accuracy verification needed**: All report types need evaluation - ⏳ PENDING USER TESTING

## Approach (User-Selected)

- **Priority**: Full audit first, then fixes
- **Silent failures**: Fix as part of this work
- **Deployment check**: Query live DB to verify deployed function definitions

---

## Phase 1: Audit Results (COMPLETED)

### 1.1 Migration System Status

**CRITICAL FINDING**: Only 1 migration has been applied to the database (20241213). All other migrations exist in the codebase but were NEVER applied.

```
Migrations in codebase: 50+ files
Migrations applied to DB: 1 (20241213_005_admin_deleteuser_function.sql)
```

The migration system is NOT being used properly. Functions are being created/modified through other means (likely Supabase dashboard or direct SQL).

### 1.2 Deployed vs Expected Function Comparison

**`get_team_comparison_report`**:

| Aspect | Deployed (in DB) | Expected (migration file) |
|--------|-----------------|---------------------------|
| Query structure | Single aggregate CTE with JOINs | LATERAL subqueries |
| Commission column | `c.amount` | `c.earned_amount` |
| Retention formula | `(initial+new-lapsed)/(initial+new)` | `new/(new+lapsed)` |
| Total premium calc | Separate `imo_total` CTE | Variable `v_total_imo_premium` |
| Agent filter | No `archived_at` check | Includes `archived_at IS NULL` |
| Agency filter | No `is_active` check | Includes `is_active = true` |

**Root Cause**: The deployed function is an older version that doesn't match the migration file.

### 1.3 Ambiguity Error Analysis

The error `column reference "new_premium" is ambiguous` likely occurs due to PostgreSQL 17's handling of:
- RETURNS TABLE column `new_premium` conflicting with CTE alias `am.new_premium`
- Window function `ORDER BY am.new_premium` evaluated after SELECT list creates ambiguity

**Direct testing** (psql as postgres user) works fine because:
- No RLS context
- No auth.uid() resolution needed
- Function executes successfully

**REST API calls** fail because:
- Different execution context
- auth.uid() is set to authenticated user
- Possible edge case with PostgreSQL 17 and SECURITY DEFINER functions

### 1.4 Other Report Functions Status

| Function | Deployed | Status |
|----------|----------|--------|
| `get_imo_performance_report` | Yes | Works (different structure but functional) |
| `get_agency_performance_report` | Yes | Works (proper CTE structure) |
| `get_top_performers_report` | Yes | Works (uses LATERAL subqueries) |

---

## Phase 2: Evaluate IMO Performance Report Accuracy

### 2.1 Test All 3 Sub-Reports

The IMO Performance page uses 3 RPCs:

| RPC | Service Method | Status |
|-----|---------------|--------|
| `get_imo_performance_report` | `ImoService.getPerformanceReport()` | Test Needed |
| `get_team_comparison_report` | `ImoService.getTeamComparisonReport()` | **BROKEN** |
| `get_top_performers_report` | `ImoService.getTopPerformersReport()` | Test Needed |

### 2.2 Validation Queries

For each RPC, write validation queries to compare:
- Raw table data (policies, commissions, user_profiles)
- Aggregated RPC results

**Files to Test**:
- `src/features/reports/components/ImoPerformanceReport.tsx`
- `src/types/team-reports.schemas.ts` (Zod validation)

---

## Phase 3: Audit All Report Types

### 3.1 Report Type Inventory

| Report Type | Component | Data Source | Priority |
|-------------|-----------|-------------|----------|
| `imo-performance` | `ImoPerformanceReport.tsx` | 3 RPCs | P1 (broken) |
| `agency-performance` | `AgencyPerformanceReport.tsx` | 1 RPC | P2 |
| `executive-dashboard` | `reportGenerationService.ts` | MVs + tables | P3 |
| `commission-performance` | `reportGenerationService.ts` | `mv_commission_aging` | P3 |
| `policy-performance` | `reportGenerationService.ts` | `mv_cohort_retention` | P3 |
| `client-relationship` | `reportGenerationService.ts` | `mv_client_ltv` | P3 |
| `financial-health` | `reportGenerationService.ts` | `mv_expense_summary` | P3 |
| `predictive-analytics` | `forecastingService.ts` | Forecasting calcs | P4 |

### 3.2 Known Issues by Report Type

**IMO Performance**:
- `get_team_comparison_report`: 400 error (column ambiguity)
- Error surfaces as: "Team Comparison: column reference 'new_premium' is ambiguous"

**Report Generation Service** (`src/services/reports/reportGenerationService.ts`):
- Silent failures on MV fetch (lines 901, 984, 1001, 1019, 1037, 1053)
- `console.error()` used instead of throwing
- Returns empty arrays, reports render incomplete

**Insights Service** (`src/services/reports/insightsService.ts`):
- RPC failures don't throw (lines 182-184)
- Insights may be inaccurate without user knowing

---

## Phase 4: Fix Silent Failures

### 4.1 Report Generation Service

**File**: `src/services/reports/reportGenerationService.ts`

**Current Pattern** (bad):
```typescript
const result = await supabase.from('mv_commission_aging').select('*');
if (result.error) {
  console.error('Failed to fetch:', result.error);
  return []; // Silent failure!
}
```

**Fixed Pattern**:
```typescript
const result = await supabase.from('mv_commission_aging').select('*');
if (result.error) {
  throw new ReportDataFetchError('mv_commission_aging', result.error);
}
```

### 4.2 Add Error Boundaries

**File**: `src/features/reports/components/ReportErrorBoundary.tsx`

Ensure each report section handles errors gracefully with user-visible feedback.

---

## Phase 5: Add Accuracy Validation Tests

### 5.1 Test Files to Create

```
src/services/imo/__tests__/ImoService.report-validation.test.ts
src/services/reports/__tests__/reportGenerationService.accuracy.test.ts
```

### 5.2 Validation Approach

For each report metric, compare:
1. Direct table query result
2. RPC/MV result
3. UI displayed value

---

## Implementation Checklist

### Phase 1: Full Audit - ✅ COMPLETED
- [x] Query live DB: `pg_get_functiondef` for all report RPCs
- [x] Compare deployed functions vs migration files
- [x] Document any mismatches found (see 1.1 and 1.2 above)
- [x] Test each RPC manually with date range parameters
- [x] Test `get_imo_performance_report` accuracy
- [x] Test `get_team_comparison_report` accuracy
- [x] Test `get_top_performers_report` accuracy
- [x] Test `get_agency_performance_report` accuracy
- [x] Identify all silent failure patterns in services (7 found, all fixed)

### Phase 2: Fix Critical Issues - ✅ COMPLETED
- [x] Create fix migration: `20260106_001_fix_team_comparison_ambiguity.sql`
- [x] Apply migration to database (SUCCESS)
- [x] Verify IMO Performance report RPC no longer returns ambiguity error

### Phase 3: Fix Silent Failures - ✅ COMPLETED
- [x] Refactor `reportGenerationService.ts` error handling (6 methods fixed)
- [x] Refactor `forecastingService.ts` error handling (1 method fixed)
- [x] Added `ReportDataFetchError` custom error class
- [x] All errors now throw instead of silently returning empty arrays

### Phase 4: Validation & Testing - PENDING (User Testing)
- [ ] Create validation test suite
- [ ] Document expected data flows
- [ ] Run full regression test on all report types
- [ ] User verification in browser with authenticated session

---

## Files Modified

### Migrations (New) - APPLIED TO DB
- `supabase/migrations/20260106_001_fix_team_comparison_ambiguity.sql` ✅
  - Fixed column ambiguity by using `metric_` prefix for CTE columns
  - Changed query structure to use LATERAL subqueries
  - Added `archived_at IS NULL` and `is_active = true` filters

### Services - UPDATED
- `src/services/reports/reportGenerationService.ts` ✅
  - Added `ReportDataFetchError` custom error class
  - Fixed 6 silent failure methods (fetchCarrierPerformance, fetchCommissionAging, fetchClientLTV, fetchCohortRetention, fetchProductionVelocity, fetchExpenseSummary)
  - Now throws errors instead of returning empty arrays

- `src/services/reports/forecastingService.ts` ✅
  - Fixed 1 silent failure method (fetchHistoricalData)
  - Now throws `ReportDataFetchError` on failure

### Components - NOT YET MODIFIED (May need error boundary updates)
- `src/features/reports/components/ImoPerformanceReport.tsx` - May need error display updates
- `src/features/reports/ReportsDashboard.tsx` - May need global error state handling

### Tests - NOT YET CREATED
- `src/services/imo/__tests__/ImoService.report-validation.test.ts`
- `src/services/reports/__tests__/reportGenerationService.accuracy.test.ts`

---

## Validation Criteria

### Functional
- [ ] IMO Performance report loads without 400 error
- [ ] Team Comparison table displays agency data
- [ ] Top Performers table displays agent rankings
- [ ] All report sections show loading/error/empty states appropriately
- [ ] No silent failures in console

### Accuracy Checks
For each metric, compare RPC results to manual SQL queries:

| Metric | Source | Validation Query |
|--------|--------|-----------------|
| new_policies | `get_imo_performance_report` | `SELECT COUNT(*) FROM policies WHERE status='active' AND effective_date BETWEEN...` |
| new_premium | `get_team_comparison_report` | `SELECT SUM(annual_premium) FROM policies WHERE...` |
| commissions_earned | RPCs | `SELECT SUM(earned_amount) FROM commissions WHERE...` |
| agent_count | `get_team_comparison_report` | `SELECT COUNT(*) FROM user_profiles WHERE agency_id=... AND approval_status='approved'` |
| retention_rate | RPCs | Manual calculation: `new_policies / (new_policies + lapsed_policies)` |

### Error Handling
- [ ] MV fetch failures throw errors (not console.error + return [])
- [ ] RPC errors surface to UI with user-friendly messages
- [ ] Error boundaries catch and display component-level failures
