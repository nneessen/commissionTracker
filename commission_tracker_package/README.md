# Commission Tracker - Documentation Package

**Date Created:** October 9, 2025
**Purpose:** Comprehensive documentation for external LLM/developer to fix KPI calculation issues

## Package Contents

### 📄 Documentation Files (`/docs`)

1. **PROJECT_OVERVIEW.md** - Complete system architecture and goals
   - Technology stack
   - Core architecture principles
   - Data flow examples
   - Key files and their purposes

2. **KPI_FORMULAS.md** - Mathematical formulas for all KPIs
   - Commission calculations (earned vs unearned)
   - Time period scaling formulas
   - Financial KPIs (profit margin, ROI, breakeven)
   - Production KPIs (premium written, averages)
   - Client KPIs (retention, lapse rates)
   - Missing KPIs to implement (CAC, LTV, persistency)

3. **CURRENT_ISSUES.md** - Detailed analysis of problems
   - Critical Issue #1: Time period scaling bug
   - Critical Issue #2: Incorrect commission field usage
   - Critical Issue #3: Missing essential KPIs
   - Critical Issue #4: Data duplication in dashboard
   - Complete fixes with code examples

4. **DATA_MODEL.md** - Database schema documentation
   - All tables with field definitions
   - Entity relationships
   - Triggers and functions
   - Sample queries
   - TypeScript type definitions

### 💾 Database Schema (`/database`)

- Migration files from `supabase/migrations/`
- Database triggers and functions
- Schema definitions for:
  - policies (source of truth)
  - commissions (with earned/unearned calculations)
  - comp_guide (commission rates)
  - expenses
  - clients, carriers, products

### 💻 Source Code (`/src`)

**Hooks:**
- `useMetricsWithDateRange.ts` - **CRITICAL** - All KPI calculations (has bugs to fix)

**Services:**
- `policyService.ts` - Policy CRUD operations
- `/commissions/*` - Commission calculation services
  - `CommissionCalculationService.ts`
  - `CommissionLifecycleService.ts`
  - `commissionService.ts`

**Features:**
- `DashboardHome.tsx` - Main KPI dashboard (needs refactoring)

**Types:**
- All TypeScript type definitions matching database schema

## Critical Issues to Fix

### 1. Time Period Scaling (HIGHEST PRIORITY)

**Problem:** Changing time period doesn't scale metrics properly

**Example:**
- Monthly expenses: $4,000
- Switch to "Weekly" → Shows $4,000 (WRONG)
- Should show: ~$923 per week

**Fix Location:** `src/hooks/useMetricsWithDateRange.ts`

**Solution:** Add scaling functions (see KPI_FORMULAS.md)

### 2. Commission Field Usage

**Problem:** Using wrong database fields

**Current (Wrong):**
```typescript
const earned = commissions.reduce((sum, c) => sum + (c.advanceAmount || 0), 0);
```

**Correct:**
```typescript
const earned = commissions.reduce((sum, c) => sum + (c.earnedAmount || 0), 0);
```

**Fix Location:** `src/hooks/useMetricsWithDateRange.ts` lines 137-145

### 3. Missing KPIs

Need to implement:
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- LTV:CAC Ratio
- Persistency cohort analysis
- Conversion funnel metrics

See KPI_FORMULAS.md for complete formulas.

## How to Use This Package

### For LLM/AI Assistant

1. Read `PROJECT_OVERVIEW.md` first to understand the system
2. Review `CURRENT_ISSUES.md` for specific problems to fix
3. Reference `KPI_FORMULAS.md` for correct mathematical implementations
4. Check `DATA_MODEL.md` when working with database queries
5. Examine source files for current implementation

### For Human Developer

1. Start with PROJECT_OVERVIEW.md for context
2. Focus on CURRENT_ISSUES.md for actionable fixes
3. Use KPI_FORMULAS.md as specification
4. Test changes with examples provided in docs

## Quick Start Fixes

### Fix #1: Time Scaling (30 minutes)

1. Open `src/utils/dateRange.ts`
2. Add scaling constants and functions (see CURRENT_ISSUES.md)
3. Update `src/hooks/useMetricsWithDateRange.ts` to use scaling
4. Test with different time periods

### Fix #2: Commission Fields (15 minutes)

1. Open `src/types/commission.types.ts`
2. Update field names to match database
3. Open `src/hooks/useMetricsWithDateRange.ts`
4. Replace `advanceAmount` with `amount`, `earnedAmount`, `unearnedAmount`
5. Test commission calculations

### Fix #3: Remove Duplicates (20 minutes)

1. Open `src/features/dashboard/DashboardHome.tsx`
2. Identify duplicate metrics (see CURRENT_ISSUES.md)
3. Remove redundant displays
4. Reorganize into clear information hierarchy

## Testing

### Test Case 1: Time Scaling
```
Input: $4,000 monthly expense, switch to weekly
Expected: ~$923/week displayed
Current: $4,000/week (BUG)
```

### Test Case 2: Commission Calculation
```
Input:
  - Total: $10,000
  - Advance Months: 9
  - Months Paid: 3
Expected:
  - Earned: $3,333.33
  - Unearned: $6,666.67
```

### Test Case 3: Breakeven
```
Input:
  - Expenses: $5,000
  - Commission: $3,000
  - Avg per Policy: $400
Expected:
  - Deficit: $2,000
  - Policies Needed: 5
```

## Key Insights for Developer

### The Main Problem

The application has solid foundations but three critical bugs:

1. **Time scaling is broken** - Makes dashboard misleading
2. **Using wrong database fields** - Commission tracking incorrect
3. **Missing essential KPIs** - Not useful for real insurance agents

### The Solution is Not Complicated

- Time scaling: Just divide/multiply by period length
- Commission fields: Use correct column names from database
- Missing KPIs: Formulas are well-defined in insurance industry

### Don't Over-Engineer

- Use existing database triggers for commission calculations
- Don't recalculate what database already computes
- Follow existing patterns in codebase
- Simple fix > complex refactor

## Important Notes

### Database Triggers Handle Commission Math

The database automatically calculates `earned_amount` and `unearned_amount` via triggers. Frontend should DISPLAY these values, not recalculate them.

**Database Trigger:**
```sql
CREATE TRIGGER trigger_update_commission_earned
  BEFORE INSERT OR UPDATE OF months_paid
  ON commissions
  EXECUTE FUNCTION update_commission_earned_amounts();
```

**Frontend Should:**
```typescript
// ✅ Good - Trust database calculation
const earned = commission.earnedAmount;

// ❌ Bad - Don't recalculate
const earned = (commission.amount / commission.advanceMonths) * commission.monthsPaid;
```

### Time Period Scaling is Critical

Without proper scaling, the entire time period selector is useless. Users will make bad business decisions based on misleading numbers.

### Real KPIs Matter

CAC, LTV, and persistency aren't "nice to have" - they're how insurance agents measure success. Without them, this is just a fancy spreadsheet.

## Contact / Questions

If implementing these fixes and need clarification:

1. See formulas in KPI_FORMULAS.md
2. Check examples in CURRENT_ISSUES.md
3. Review database schema in DATA_MODEL.md
4. Examine existing code patterns in source files

## Success Criteria

After fixes, the application should:

1. ✅ Show different values when time period changes
2. ✅ Calculate earned/unearned commissions correctly
3. ✅ Display CAC, LTV, and persistency metrics
4. ✅ Have no duplicate metrics
5. ✅ Match test cases in KPI_FORMULAS.md

## File Structure

```
commission_tracker_package/
├── README.md (this file)
├── docs/
│   ├── PROJECT_OVERVIEW.md
│   ├── KPI_FORMULAS.md
│   ├── CURRENT_ISSUES.md
│   └── DATA_MODEL.md
├── database/
│   └── migrations/
│       └── (SQL migration files)
├── src/
│   ├── hooks/
│   │   └── useMetricsWithDateRange.ts
│   ├── services/
│   │   ├── policyService.ts
│   │   └── commissions/
│   ├── features/
│   │   └── DashboardHome.tsx
│   └── types/
│       └── (TypeScript type definitions)
```

---

**This package contains everything needed to understand and fix the Commission Tracker KPI system.**

Good luck! 🚀
