# Commission Data Architecture & Contract Level System

## Critical: Single Source of Truth

**ALL commission data MUST come from the database `commissions` table.**
**NEVER calculate commissions client-side for display purposes.**

## Database Schema

### Commissions Table
- `id` - UUID primary key
- `policy_id` - References policies table
- `amount` - **THE commission amount (includes contract level multiplier)**
- `advance_months` - Number of months advanced (typically 9)
- `months_paid` - Months client has paid
- `earned_amount` - Portion actually earned
- `unearned_amount` - Portion at risk of chargeback
- `rate` - Commission rate from policy
- `status` - pending | earned | paid | charged_back | cancelled
- `type` - advance | renewal | bonus

### Commission Calculation Formula (Database Function)

```sql
Commission Amount = (Annual Premium / 12) × Commission % × Contract Level × Advance Months
```

**Example with Contract Level 120:**
- Annual Premium: $2,100
- Commission Rate: 1.10 (110%)
- Contract Level: 120 (stored as 120, divided by 100 = 1.20 multiplier)
- Advance Months: 9

Calculation:
```
= ($2,100 / 12) × 1.10 × 1.20 × 9
= $175 × 1.10 × 1.20 × 9
= $2,079.00
```

## Contract Level System

### What is Contract Level?
Contract level is a multiplier applied to commission calculations based on the agent's contract tier with the carrier. It represents the agent's commission level as a percentage.

**Examples:**
- Contract Level 100 = 1.00x multiplier (100% = base rate)
- Contract Level 110 = 1.10x multiplier (110% = 10% bonus)
- Contract Level 120 = 1.20x multiplier (120% = 20% bonus)
- Contract Level 190 = 1.90x multiplier (190% = 90% bonus)

### Where Contract Level is Stored
- **User Profile:** `auth.users.raw_user_meta_data->>'contract_comp_level'`
- **Current User Contract Level:** 120 (as of Nov 2025)

### How Contract Level is Applied

1. **At Policy Creation:**
   - Trigger: `auto_create_commission_record()`
   - Fetches user's contract level from auth.users
   - Calls `calculate_commission_advance()` function with contract level
   - Stores calculated amount in `commissions.amount`

2. **Database Function:**
```sql
-- In auto_create_commission_record trigger
v_contract_level := COALESCE(
  (
    SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
    FROM auth.users
    WHERE id = NEW.user_id
  ),
  1.0  -- Default to 100% if not set
);
```

## Data Flow: Correct vs Incorrect

### ✅ CORRECT: Dashboard (useMetricsWithDateRange)
```
DashboardHome Component
  ↓
useMetricsWithDateRange({ timePeriod, targetAvgPremium })
  ↓
useCommissions() hook
  ↓
commissionService.getAll()
  ↓
CommissionRepository.findAll()
  ↓
Supabase: SELECT * FROM commissions
  ↓
Returns commission.amount (includes contract level)
  ↓
Display: commission.amount
```

### ❌ INCORRECT (FIXED): Policies Page (OLD)
```
PolicyList Component
  ↓
calculateCommissionAdvance(
  policy.annualPremium,
  policy.commissionPercentage,
  9  // hardcoded months
)
  ↓
Returns: (annual_premium / 12) × commission% × 9
  ↓
MISSING: Contract level multiplier
  ↓
Display: 20% LESS than actual (if contract level 120)
```

### ✅ CORRECT (FIXED): Policies Page (NEW)
```
PolicyList Component
  ↓
useCommissions() hook
  ↓
commissionsByPolicy[policy.id]
  ↓
Display: policyCommission?.amount || 0
  ↓
Shows exact same value as Dashboard
```

## Files Fixed (Nov 2025)

### 1. PolicyList.tsx
- **Line 576-580:** Replaced `calculateCommissionAdvance()` with `policyCommission?.amount || 0`
- **Line 65:** Removed unused import for `calculateCommissionAdvance`
- **Result:** Now displays database commission values with contract level

### 2. PolicyListInfinite.tsx
- **Line 14:** Added `import { useCommissions } from "../../hooks/commissions/useCommissions"`
- **Line 86-92:** Added useCommissions hook and commissionsByPolicy map
- **Line 262-265:** Replaced `calculateCommissionAdvance()` with `policyCommission?.amount || 0`
- **Line 17:** Removed unused import for `calculateCommissionAdvance`
- **Result:** Now displays database commission values with contract level

### 3. useMetrics.ts
- **Status:** DEPRECATED/UNUSED
- **Reason:** Dashboard and all features use `useMetricsWithDateRange` instead
- **Action:** No changes needed (not in use)

## When to Use calculateCommissionAdvance()

The `calculateCommissionAdvance()` utility function should ONLY be used for:

1. **Policy Preview (before creation):**
   - Showing estimated commission before policy is saved
   - Must warn user it's an estimate without contract level

2. **"What-If" Calculators:**
   - Testing different premium amounts
   - Exploring commission scenarios
   - Must clearly label as estimates

3. **Admin Testing Tools:**
   - Debugging commission calculations
   - Comparing calculated vs actual values

**NEVER use for production display of commission data!**

## Verification Checklist

When displaying commission data anywhere in the app:

- [ ] Data comes from `useCommissions()` hook
- [ ] Displays `commission.amount` from database
- [ ] Does NOT call `calculateCommissionAdvance()` for display
- [ ] Shows same values as Dashboard
- [ ] Respects commission status (pending/earned/paid)
- [ ] Includes contract level multiplier automatically

## Testing Verification (Nov 2025)

**Sample Policies Tested:**

| Policy | Client | Annual Premium | Commission % | Contract Level | DB Amount | Status |
|--------|--------|----------------|--------------|----------------|-----------|--------|
| 1234 | Barbara Streisand | $2,100 | 1.10 (110%) | 120 (1.20x) | $2,079.00 | ✅ Verified |
| 123 | Billy Bob | $2,100 | 1.00 (100%) | 120 (1.20x) | $1,890.00 | ✅ Verified |
| 11 | Ronald McDonald | $1,980 | 0.50 (50%) | 110 (1.10x) | $816.75 | ✅ Verified* |

*Policy 11 was created with contract level 110, then user upgraded to 120

## Common Issues & Solutions

### Issue: Commission values different on Dashboard vs Policies page
**Cause:** Policies page using client-side calculation without contract level
**Solution:** Use database commission values (policyCommission?.amount)
**Status:** ✅ FIXED (Nov 2025)

### Issue: Commission too low compared to expected
**Cause:** Contract level not being applied
**Solution:** Verify commission record was created by trigger with contract level
**Check:** Query commissions table and compare to manual calculation

### Issue: Commission calculation formula unclear
**Cause:** Multiple places with different formulas
**Solution:** Always refer to database function `calculate_commission_advance()`
**Location:** `supabase/migrations/*_create_commission_functions.sql`

## Key Takeaways

1. **Database is single source of truth** for all commission data
2. **Contract level** is automatically applied during policy creation
3. **Never recalculate** commissions client-side for display
4. **Dashboard and Policies page** must show identical commission values
5. **User's current contract level:** 120 (1.20x multiplier = 20% bonus)

## Related Files

- Database Functions: `supabase/migrations/*_commission_*.sql`
- Hooks: `src/hooks/commissions/useCommissions.ts`
- Services: `src/services/commissions/CommissionRepository.ts`
- Display: `src/features/policies/PolicyList.tsx`
- Display: `src/features/policies/PolicyListInfinite.tsx`
- Metrics: `src/hooks/useMetricsWithDateRange.ts`
- Utils: `src/utils/policyCalculations.ts` (for estimates only!)
