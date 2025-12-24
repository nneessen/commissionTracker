# Date Handling Standardization Plan

## Session Continuation Prompt

Standardize all date handling across the application to prevent timezone-related bugs (off-by-one day errors, incorrect month filtering).

---

## The Problem

When JavaScript parses a date string like `"2025-08-01"` using `new Date("2025-08-01")`, it interprets it as **UTC midnight**. When displayed in US timezones (UTC-5 to UTC-8), this becomes **July 31, 2025** - one day earlier.

### Example
```typescript
// BAD - causes off-by-one day errors in US timezones
new Date("2025-08-01")  // Aug 1 00:00 UTC = Jul 31 19:00 EST

// GOOD - creates date in local timezone
parseLocalDate("2025-08-01")  // Aug 1 00:00 local
```

---

## The Solution

The codebase already has a `parseLocalDate()` function in `src/lib/date.ts` that correctly handles this. All instances of `new Date(dateString)` for date-only values must be replaced with `parseLocalDate(dateString)`.

### When to use `parseLocalDate()`
- Date columns from database (effective_date, submit_date, expiration_date, etc.)
- Date strings in YYYY-MM-DD format
- Any date without a time component

### When `new Date()` is still OK
- Timestamps with time components (created_at, updated_at with full ISO strings)
- Creating "now" timestamps: `new Date()`
- Date arithmetic: `new Date(year, month, day)`

---

## Files Requiring Changes

### Priority 1: Analytics/Dashboard (User-facing, affects KPIs)
| File | Lines | Pattern |
|------|-------|---------|
| `src/services/analytics/policyStatusService.ts` | 88, 94, 100 | `new Date(p.effectiveDate)` |
| `src/services/analytics/cohortService.ts` | 53, 89, 100, 109, 159, 198, 244 | `new Date(policy.effectiveDate)` |
| `src/services/analytics/forecastService.ts` | 74, 224, 308 | `new Date(policy.effectiveDate)` |
| `src/services/analytics/attributionService.ts` | 171 | `new Date(p.effectiveDate)` |
| `src/services/analytics/segmentationService.ts` | 102, 245 | `new Date(p.effectiveDate)` |
| `src/hooks/kpi/useMetrics.ts` | 209, 217, 640 | `new Date(p.effectiveDate)` |
| `src/hooks/targets/useHistoricalAverages.ts` | 185, 202 | `new Date(p.effectiveDate)` |
| `src/features/analytics/components/CommissionPipeline.tsx` | 61, 80 | `new Date(policy.effectiveDate)` |

### Priority 2: Services (Business logic)
| File | Lines | Pattern |
|------|-------|---------|
| `src/services/policies/PolicyRepository.ts` | 634, 640 | `new Date(p.effective_date)` |
| `src/services/clients/client/ClientService.ts` | 471 | `new Date(p.effectiveDate)` |
| `src/services/commissions/CommissionStatusService.ts` | 542 | `new Date(item.effective_date)` |
| `src/services/commissions/commissionRateService.ts` | 307 | `new Date(item.effectiveDate)` |
| `src/services/reports/drillDownService.ts` | 244, 326 | `new Date(p.effective_date)` |
| `src/services/reports/insightsService.ts` | 485 | `new Date(p.effective_date)` |

### Priority 3: UI Components
| File | Lines | Pattern |
|------|-------|---------|
| `src/features/comps/CompTable.tsx` | 371 | `new Date(record.effective_date).toLocaleDateString()` |
| `src/features/policies/utils/policyFormTransformer.ts` | 69, 103 | `new Date(form.effectiveDate)` |
| `src/features/dashboard/DashboardHome.tsx` | 262 | `new Date(formData.effectiveDate)` |
| `src/features/settings/components/CompGuideImporter.tsx` | 200 | `new Date(item.effectiveDate)` |

### Priority 4: Lower Priority (Migrations, tests)
| File | Lines | Pattern |
|------|-------|---------|
| `src/utils/dataMigration.ts` | 236, 239, 279, 282 | Various date parsing |

---

## Implementation Steps

### Step 1: Add import to each file
```typescript
import { parseLocalDate } from "@/lib/date";
// or
import { parseLocalDate } from "../../lib/date";
```

### Step 2: Replace patterns
```typescript
// BEFORE
const effectiveDate = new Date(p.effectiveDate);
new Date(policy.effectiveDate).getFullYear()
new Date(p.effective_date).toLocaleDateString()

// AFTER
const effectiveDate = parseLocalDate(p.effectiveDate);
parseLocalDate(policy.effectiveDate).getFullYear()
formatDate(p.effective_date)  // Use formatDate from lib/format.ts for display
```

### Step 3: For display formatting, prefer `formatDate()`
```typescript
import { formatDate } from "@/lib/format";

// Instead of:
new Date(p.effective_date).toLocaleDateString()

// Use:
formatDate(p.effective_date)
```

---

## Testing After Changes

1. Run `npm run build` - must pass with zero errors
2. Check dashboard - future dates should NOT appear in current month
3. Check policies table - dates should match what was entered
4. Check analytics - month filtering should be accurate

---

## Already Fixed

### Previous Session
- `src/hooks/analytics/useAnalyticsData.ts` - Fixed lines 35, 77, 80
- `src/services/analytics/gamePlanService.ts` - Fixed lines 112, 280, 430

### Current Session (Completed 2025-12-20)

**Priority 1: Analytics/Dashboard**
- `src/services/analytics/policyStatusService.ts` - Fixed lines 88, 94, 100
- `src/services/analytics/cohortService.ts` - Fixed lines 53, 89, 100, 109, 159, 198, 244
- `src/services/analytics/forecastService.ts` - Fixed lines 74, 224, 308
- `src/services/analytics/attributionService.ts` - Fixed line 171
- `src/services/analytics/segmentationService.ts` - Fixed lines 102, 245
- `src/hooks/kpi/useMetrics.ts` - Fixed lines 209, 217, 640
- `src/hooks/targets/useHistoricalAverages.ts` - Fixed lines 185, 202
- `src/features/analytics/components/CommissionPipeline.tsx` - Fixed lines 61, 80

**Priority 2: Services (Business logic)**
- `src/services/policies/PolicyRepository.ts` - Fixed lines 634, 640
- `src/services/clients/client/ClientService.ts` - Fixed line 471
- `src/services/commissions/CommissionStatusService.ts` - Fixed line 542
- `src/services/commissions/commissionRateService.ts` - Fixed line 307
- `src/services/reports/drillDownService.ts` - Fixed lines 244, 326
- `src/services/reports/insightsService.ts` - Fixed line 485

**Priority 3: UI Components**
- `src/features/comps/CompTable.tsx` - Fixed lines 371, 375-377
- `src/features/policies/utils/policyFormTransformer.ts` - Fixed lines 69, 71, 103, 106
- `src/features/dashboard/DashboardHome.tsx` - Fixed lines 262, 265
- `src/features/settings/components/CompGuideImporter.tsx` - Fixed line 200

---

## Status: COMPLETE (Priority 1-3)

All major files have been fixed. Only Priority 4 (dataMigration.ts) remains as optional/low priority.

---

## Continuation Prompt (if needed for Priority 4)

```
Continue date standardization. Priority 1-3 are COMPLETE. Only Priority 4 remains:

File: src/utils/dataMigration.ts (lines 236, 239, 279, 282)

Pattern to fix: Replace `new Date(dateString)` with `parseLocalDate(dateString)` for date-only values.

1. Add import: import { parseLocalDate } from "@/lib/date";
2. Replace the 4 instances
3. Run npm run build to verify
```
