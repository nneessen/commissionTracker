# Policy Creation & Commission Calculation - Comprehensive Review

**Status**: ACTIVE (In Progress)
**Started**: 2025-10-03
**Priority**: CRITICAL
**Goal**: Fix policy creation RLS violations and clarify commission/advance calculation logic

---

## 🚨 CRITICAL ISSUES FIXED

### 1. ✅ RLS Policy Violation - RESOLVED
**Error**: `POST /rest/v1/clients 403 Forbidden - new row violates row-level security policy for table "clients"`

**Root Cause**:
- `clients` table has RLS enabled requiring `auth.uid() = user_id`
- `clientService.createOrFind()` was NOT setting `user_id` when creating clients

**Fix Applied**:
- ✅ Updated `clientService.ts` to require and use `userId` parameter
- ✅ Modified signature: `createOrFind(clientData: ClientData, userId: string)`
- ✅ Added `user_id` to INSERT: `insert([{ ...clientData, user_id: userId }])`
- ✅ Updated `PolicyDashboard.tsx` to get `user` from `useAuth()` hook
- ✅ Pass `user.id` to `clientService.createOrFind()` in both add and update functions
- ✅ Added authentication checks before client creation

**Files Modified**:
- `src/services/clients/clientService.ts`
- `src/features/policies/PolicyDashboard.tsx`

---

## 📊 COMMISSION CALCULATION ANALYSIS

### Current Implementation Overview

#### Database Schema (001_initial_schema.sql)

**policies table**:
```sql
annual_premium DECIMAL(10,2) NOT NULL,
payment_frequency payment_frequency DEFAULT 'monthly',
commission_percentage DECIMAL(5,4),  -- Max 9.9999 (999.99%)
```

**commissions table**:
```sql
commission_amount DECIMAL(10,2) NOT NULL,
advance_months INTEGER DEFAULT 0,
```

#### Code Implementation

**Location**: `src/services/commissions/CommissionCalculationService.ts`

**Method 1**: `calculateCommissionWithCompGuide()` (lines 132-179)
```typescript
// Calculate commission amount
const annualPremium = data.monthlyPremium * 12;
const commissionCalculation = {
  amount: (annualPremium * rateResult.data) / 100,
  rate: rateResult.data
};
```
**Formula**: `Commission = (Monthly Premium × 12) × (Rate / 100)`
**Result**: **FULL YEAR COMMISSION**

**Method 2**: Fallback in `createWithAutoCalculation()` (lines 244-247)
```typescript
if (!finalData.commissionAmount && finalData.monthlyPremium && finalData.commissionRate) {
  const advanceMonths = finalData.advanceMonths || 9;
  finalData.commissionAmount = finalData.monthlyPremium * advanceMonths * (finalData.commissionRate / 100);
}
```
**Formula**: `Commission = Monthly Premium × Advance Months × (Rate / 100)`
**Result**: **ADVANCE COMMISSION** (typically 9 months)

### ⚠️ CRITICAL INCONSISTENCY IDENTIFIED

**The two methods calculate DIFFERENT amounts**:

1. **Auto-calculated (Method 1)**: Returns full annual commission
   - Example: $500/mo × 12 × 102.5% / 100 = **$6,150**

2. **Fallback (Method 2)**: Returns advance only
   - Example: $500/mo × 9 × 102.5% / 100 = **$4,612.50**

**Impact**: Depending on which path executes, the commission amount differs by 25% (3 months)!

---

## 🎯 COMMISSION CALCULATION BUSINESS RULES (To Be Documented)

### Questions to Answer:

1. **What is an "advance"?**
   - Is it a partial payment of the full year commission?
   - Or is it a different calculation entirely?

2. **What should be stored in the database?**
   - Full year commission amount?
   - Only the advance amount?
   - Both (separate columns)?

3. **How should advanceMonths be used?**
   - Only for display/tracking purposes?
   - Or should it affect the actual commission calculation?

4. **What is the correct formula?**
   ```
   Option A: Commission = Annual Premium × Rate / 100
   (Full year commission, advanceMonths is just metadata)

   Option B: Commission = Monthly Premium × advanceMonths × Rate / 100
   (Only the advance amount, need separate tracking for total)

   Option C: Both are tracked separately
   (Database needs advance_amount and total_commission columns)
   ```

### Current Default Values
- Default `advanceMonths`: **9** (from code line 235, 245, 250, 330)
- Default `contractCompLevel`: **100** (from code)

---

## 📋 RECOMMENDED FIXES

### Priority 1: Standardize Calculation Logic

**Recommendation**: Use **FULL YEAR COMMISSION** as the primary amount

**Rationale**:
- Consistent with comp guide lookups (which return annual rates)
- Easier to track actual earned commission vs advances received
- `advanceMonths` becomes metadata for payment scheduling

**Required Changes**:
1. Remove fallback calculation at lines 244-247 in `CommissionCalculationService.ts`
2. Always calculate: `commissionAmount = annualPremium × rate / 100`
3. Add computed field: `advanceAmount = (commissionAmount / 12) × advanceMonths`
4. Update database schema to add `advance_amount` column if tracking advances separately

### Priority 2: Add Validation for Commission Percentage

**Issue**: Database DECIMAL(5,4) allows max 9.9999 (999.99%)

**Risk**: Insurance commissions can exceed 100% (e.g., 125%, 145%)

**Recommendation**:
- If commissions > 999.99% are expected, change schema to DECIMAL(6,4) or DECIMAL(7,4)
- Add validation in PolicyDashboard before division by 100

**Code Addition** (PolicyDashboard.tsx):
```typescript
// Validate commission percentage before conversion
if (formData.commissionPercentage > 999.99) {
  throw new Error('Commission percentage cannot exceed 999.99%');
}
```

### Priority 3: Document Business Rules

**Create**: `docs/commission-calculation.md`

**Contents**:
- Definition of "advance" vs "total commission"
- Calculation formulas with examples
- How `advanceMonths` affects payments
- Relationship between policies and commissions
- Edge cases (renewals, chargebacks, etc.)

---

## 📁 Files Requiring Further Review

1. **src/services/commissions/CommissionCalculationService.ts**
   - Line 157-169: `calculateCommissionWithCompGuide()`
   - Line 244-247: Fallback calculation
   - **Action**: Standardize calculation logic

2. **src/services/commissions/commissionService.old.ts**
   - Lines 324-327: Another instance of fallback calculation
   - **Action**: Ensure consistency if this file is still used

3. **supabase/migrations/001_initial_schema.sql**
   - Line 86: `commission_percentage DECIMAL(5,4)`
   - **Action**: Verify precision is sufficient

4. **src/features/policies/PolicyDashboard.tsx**
   - Line 78: Division by 100
   - **Action**: Add validation for max percentage

---

## ✅ COMPLETED TASKS

- [x] Fixed RLS violation by adding `user_id` to `clientService`
- [x] Updated PolicyDashboard to use auth context
- [x] Identified commission calculation inconsistency
- [x] Analyzed database schema constraints
- [x] Documented current implementation

## 🔄 PENDING TASKS

- [ ] Clarify business rules for advance vs total commission
- [ ] Standardize commission calculation logic
- [ ] Add commission percentage validation
- [ ] Update database schema if needed (commission_percentage precision)
- [ ] Add `advance_amount` column if tracking advances separately
- [ ] Create comprehensive commission calculation documentation
- [ ] Add unit tests for commission calculations
- [ ] Test end-to-end policy creation flow

---

## 🎬 NEXT STEPS

1. **Immediate**: Test policy creation to verify RLS fix works
2. **Short-term**: Get business requirements clarification on advance calculations
3. **Medium-term**: Implement standardized calculation logic
4. **Long-term**: Add comprehensive documentation and tests

---

## 📞 Questions for Product Owner / Business

1. When an agent receives a "9-month advance" on a policy:
   - Do they receive 9/12 of the annual commission?
   - Or is the commission rate itself calculated differently for advances?

2. Should the `commissions` table store:
   - The full year commission amount? (recommended)
   - The advance amount received?
   - Both?

3. Are commission percentages ever expected to exceed 999.99%?
   - Current database limit is DECIMAL(5,4) = max 9.9999 = 999.99%
   - Common insurance commissions are 80%-145%, which fits
   - But need to confirm business requirements

---

**Last Updated**: 2025-10-03
**Status**: Awaiting business requirements clarification on advance calculation methodology
