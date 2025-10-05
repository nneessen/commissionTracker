# Implementation Plan: Contract-Level Commission Flow

**Status**: ACTIVE
**Created**: 2025-11-05
**Priority**: HIGH
**Estimated Effort**: 2-3 days
**Related Doc**: `docs/policy-addition-flow.md`

---

## Executive Summary

**Problem**: Current policy creation flow uses simplified product-level commission rates, completely ignoring agent contract levels. This results in incorrect commission calculations where all agents receive the same rate regardless of their actual contract level.

**Impact**:
- Agent with contract level 100 (release) and agent with level 140 (premium) both get same commission on identical product
- No commission records created during policy creation
- No advance calculation
- No earned/unearned tracking for tax purposes

**Solution**: Integrate `comp_guide` table lookup based on user's `contract_comp_level` to determine correct commission rates per agent's contract level.

**Scope**: Fix commission calculation flow only. Defer user registration enhancements and tax accounting features to future iterations.

---

## Current vs Desired State

### Current Flow (Broken)

```
1. User selects product
   ↓
2. Auto-fill commission from product.commission_percentage (SAME FOR ALL USERS)
   ↓
3. Create policy record only
   ↓
4. No commission record created ❌
5. No advance calculation ❌
```

**Issues**:
- Ignores user's contract level
- All agents get same commission rate (incorrect)
- No commission tracking
- No tax accounting capability

### Desired Flow (Fixed)

```
1. User selects product
   ↓
2. Query comp_guide with (product_id, user.contract_comp_level, today)
   ↓
3. Auto-fill commission from comp_guide result (UNIQUE PER USER)
   ↓
4. Create policy record
   ↓
5. Calculate advance: monthly_premium × 9 × commission_percentage
   ↓
6. Create commission record with advance tracking ✅
```

**Benefits**:
- Correct commission rate per agent's contract level
- Automatic commission record creation
- Advance calculation built-in
- Foundation for future tax accounting

---

## Three-Phase Implementation

### Phase 1: Create useCompGuide Hook

**Goal**: Build reusable hook to query comp_guide table

**File to Create**: `src/hooks/comps/useCompGuide.ts`

**Implementation**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface CompGuideResult {
  commission_percentage: number;
  bonus_percentage: number;
}

export const useCompGuide = (productId: string, contractLevel: number) => {
  return useQuery({
    queryKey: ['comp_guide', productId, contractLevel],
    queryFn: async (): Promise<CompGuideResult | null> => {
      if (!productId || !contractLevel) return null;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('comp_guide')
        .select('commission_percentage, bonus_percentage')
        .eq('product_id', productId)
        .eq('contract_level', contractLevel)
        .lte('effective_date', today)
        .or(`expiration_date.is.null,expiration_date.gte.${today}`)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('comp_guide query error:', error);
        return null;
      }

      return data;
    },
    enabled: !!productId && !!contractLevel,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
```

**File to Update**: `src/hooks/comps/index.ts`
```typescript
// Add export
export { useCompGuide } from './useCompGuide';
```

**Testing**:
- Test with valid product_id and contract_level → should return commission data
- Test with invalid product_id → should return null
- Test with no comp_guide match → should return null (fallback handled in Phase 2)

**Success Criteria**:
- ✅ Hook queries comp_guide correctly
- ✅ Returns commission_percentage and bonus_percentage
- ✅ Handles missing data gracefully
- ✅ Caches results for performance

---

### Phase 2: Integrate Contract Level into PolicyForm

**Goal**: Use user's contract level to lookup correct commission rate from comp_guide

**File to Modify**: `src/features/policies/PolicyForm.tsx`

**Changes Required**:

1. **Import useCompGuide hook**:
```typescript
import { useCompGuide } from '../../hooks/comps/useCompGuide';
```

2. **Get user's contract level from useAuth** (users view already exposes this):
```typescript
const { user } = useAuth(); // Already imported
const userContractLevel = user?.raw_user_meta_data?.contract_comp_level || 100;
```

3. **Use useCompGuide hook when product selected**:
```typescript
// Add after products hook
const { data: compGuideData } = useCompGuide(
  formData.productId,
  userContractLevel
);
```

4. **Update product selection handler** (lines 160-169):
```typescript
// REPLACE existing logic
else if (name === 'productId') {
  const selectedProduct = products.find(p => p.id === value);

  setFormData(prev => ({
    ...prev,
    productId: value,
    product: selectedProduct?.product_type || 'term_life',
    // Use comp_guide if available, fallback to product.commission_percentage
    commissionPercentage: 0, // Will be set by useEffect below
  }));
}
```

5. **Add useEffect to update commission when comp_guide data changes**:
```typescript
// Add after existing useEffects
useEffect(() => {
  if (formData.productId && compGuideData) {
    // Use comp_guide commission rate
    setFormData(prev => ({
      ...prev,
      commissionPercentage: compGuideData.commission_percentage * 100, // Convert to percentage
    }));
  } else if (formData.productId && !compGuideData) {
    // Fallback to product commission rate
    const selectedProduct = products.find(p => p.id === formData.productId);
    setFormData(prev => ({
      ...prev,
      commissionPercentage: selectedProduct?.commission_percentage
        ? selectedProduct.commission_percentage * 100
        : 0,
    }));
  }
}, [formData.productId, compGuideData, products]);
```

**Optional Enhancement**: Add UI indicator showing commission source
```typescript
// Add after commission percentage display
{formData.commissionPercentage > 0 && (
  <p className="text-xs text-gray-500">
    {compGuideData
      ? `Rate from contract level ${userContractLevel}`
      : 'Default product rate'}
  </p>
)}
```

**Testing**:
- Test with user contract level 100 → should show commission from comp_guide
- Test with user contract level 140 → should show higher commission from comp_guide
- Test with product that has no comp_guide entry → should fallback to product.commission_percentage
- Verify commission updates correctly when switching products

**Success Criteria**:
- ✅ Commission auto-fills based on user's contract level
- ✅ Different users see different rates for same product
- ✅ Fallback works when comp_guide has no match
- ✅ UI updates correctly when product changes

---

### Phase 3: Auto-Create Commission Records

**Goal**: Automatically create commission record when policy created, with correct advance calculation

**File to Modify**: `src/services/policies/policyService.ts`

**Changes Required**:

1. **Update create() method** (currently lines 27-29):
```typescript
async create(policyData: CreatePolicyData): Promise<Policy> {
  // 1. Create policy record
  const policy = await this.repository.create(policyData);

  // 2. Calculate advance amount
  const monthlyPremium = policyData.monthly_premium || 0;
  const commissionRate = policyData.commission_percentage || 0;
  const advanceMonths = 9; // Industry standard
  const advanceAmount = monthlyPremium * advanceMonths * commissionRate;

  // 3. Create commission record
  if (advanceAmount > 0) {
    const { error: commissionError } = await supabase
      .from('commissions')
      .insert([{
        user_id: policy.user_id,
        policy_id: policy.id,
        carrier_id: policy.carrier_id,
        commission_amount: advanceAmount,
        payment_date: policy.effective_date,
        status: 'pending',
        is_advance: true,
        advance_months: advanceMonths,
        months_paid: 0,
        earned_amount: 0,
        unearned_amount: advanceAmount,
      }]);

    if (commissionError) {
      console.error('Failed to create commission record:', commissionError);
      // Don't fail policy creation if commission creation fails
      // Can be retried/fixed manually
    }
  }

  return policy;
}
```

2. **Update TanStack Query invalidation** in `src/hooks/policies/useCreatePolicy.ts`:
```typescript
onSuccess: () => {
  // Invalidate both policies and commissions queries
  queryClient.invalidateQueries({ queryKey: ['policies'] });
  queryClient.invalidateQueries({ queryKey: ['commissions'] });
}
```

**Error Handling Strategy**:
- If policy creation fails → entire operation fails (expected behavior)
- If commission creation fails → log error but don't fail policy creation
- Rationale: Better to have policy without commission record (can fix manually) than lose entire policy

**Future Enhancement** (not in this phase):
- Add transaction support for atomic policy + commission creation
- Requires database-level transaction handling

**Testing**:
- Create policy with $500/month premium, 102.5% commission → verify commission record created with $4,612.50 advance
- Create policy with $1000/month premium, 95% commission → verify commission record created with $8,550 advance
- Verify commission record has correct fields: is_advance=true, months_paid=0, earned_amount=0, unearned_amount=advance
- Test with zero premium → should not create commission record

**Success Criteria**:
- ✅ Commission record automatically created when policy created
- ✅ Advance amount calculated correctly: monthly_premium × 9 × commission_rate
- ✅ Commission record has correct initial values (months_paid=0, earned=0, unearned=advance)
- ✅ Policy creation still works even if commission creation fails

---

## Files to Modify Summary

### New Files (1)
1. `src/hooks/comps/useCompGuide.ts` - comp_guide lookup hook

### Modified Files (3)
1. `src/hooks/comps/index.ts` - export new hook
2. `src/features/policies/PolicyForm.tsx` - use contract level for commission lookup
3. `src/services/policies/policyService.ts` - auto-create commission records

**Total**: 4 files touched

---

## What We're NOT Doing (Keep It Simple)

### Deferred to Future Iterations

1. **Enhanced User Registration**
   - Not adding contract_level, upline, agency fields to signup form
   - Admins can manually set contract_level via Supabase dashboard
   - Or create settings page for users to update their profile
   - Reason: Not critical path for fixing commission calculation

2. **Transaction Rollback**
   - Not implementing atomic policy + commission creation
   - If commission fails, policy still created (can fix manually)
   - Reason: Adds complexity, low-risk failure scenario

3. **Month-by-Month Earned Tracking**
   - Not implementing automatic monthly payment tracking
   - Not updating earned_amount/unearned_amount automatically
   - Reason: Complex feature, requires cron job or background service

4. **Chargeback Automation**
   - Not automatically creating chargebacks when policy lapses
   - Reason: Business logic complexity, manual process acceptable for now

5. **Tax Reporting**
   - Not generating tax reports
   - Reason: Future feature after earned tracking implemented

### Why Defer?

- **Focus**: Fix core commission calculation issue first
- **Risk**: Minimize scope creep and implementation complexity
- **Value**: 80% of value with 20% of effort
- **Iteration**: Can add enhancements later based on real usage

---

## Testing Strategy

### Unit Tests

**Phase 1: useCompGuide Hook**
- Test comp_guide query with valid product_id and contract_level
- Test null return when no match found
- Test caching behavior (5-minute staleTime)

**Phase 2: PolicyForm Integration**
- Mock useAuth to return different contract levels
- Verify commission updates correctly
- Test fallback to product.commission_percentage

**Phase 3: Commission Creation**
- Mock policy creation
- Verify commission record created with correct fields
- Test advance calculation: $500 × 9 × 1.025 = $4,612.50

### Integration Tests

**End-to-End Flow**:
1. User A (contract level 100) creates policy for Product X
   - Verify commission from comp_guide for level 100
   - Verify commission record created with correct advance
2. User B (contract level 140) creates same policy for Product X
   - Verify different commission rate from comp_guide for level 140
   - Verify different advance amount calculated

**Edge Cases**:
- Product with no comp_guide entry → fallback to product.commission_percentage
- User with no contract_level (defaults to 100)
- Zero premium policy → no commission record created

### Manual Testing Checklist

- [ ] Create policy as user with contract level 100
- [ ] Verify correct commission rate displayed
- [ ] Verify commission record created in database
- [ ] Verify advance calculation correct
- [ ] Create policy as user with contract level 140
- [ ] Verify higher commission rate displayed
- [ ] Create policy for product with no comp_guide entry
- [ ] Verify fallback to product commission works
- [ ] Check commission records in database match expectations

---

## Rollout Strategy

### Phase 1 Rollout (useCompGuide Hook)
1. Create hook file
2. Export from index
3. Write unit tests
4. Merge to main

**Risk**: Low - just a new hook, doesn't affect existing flow

### Phase 2 Rollout (PolicyForm Integration)
1. Update PolicyForm to use useCompGuide
2. Test locally with different contract levels
3. Deploy to staging
4. Verify with test users at different contract levels
5. Merge to main

**Risk**: Medium - changes core policy creation UI
**Mitigation**: Fallback to product.commission_percentage if comp_guide fails

### Phase 3 Rollout (Commission Auto-Creation)
1. Update PolicyService.create()
2. Update useCreatePolicy invalidation
3. Test locally
4. Deploy to staging
5. Create test policies, verify commission records created
6. Merge to main

**Risk**: Medium - changes database inserts
**Mitigation**: Non-blocking errors (policy created even if commission fails)

### Deployment Order

1. Deploy Phase 1 + 2 together (commission lookup)
2. Verify commission rates display correctly in UI
3. Deploy Phase 3 separately (commission record creation)
4. Verify commission records being created

**Rollback Plan**:
- Phase 1+2: Revert PolicyForm changes, falls back to product.commission_percentage
- Phase 3: Revert PolicyService changes, policies created without commission records

---

## Success Metrics

### Functional Metrics
- ✅ 100% of policies created with contract-level commission rates
- ✅ 100% of policies auto-create commission records
- ✅ 0 manual commission rate adjustments needed

### Technical Metrics
- ✅ comp_guide queries cached (5-minute staleTime)
- ✅ No performance degradation in policy creation
- ✅ <1% commission record creation failures

### Business Metrics
- ✅ Agents see correct commission rates based on their contract level
- ✅ Commission tracking enabled for tax purposes
- ✅ Foundation laid for future earned/unearned tracking

---

## Future Enhancements (Post-Implementation)

### Short Term (Next 1-2 Months)
1. **User Settings Page**
   - Allow users to view/update contract_level
   - Display upline, agency info
   - Update auth.users.raw_user_meta_data

2. **Commission Dashboard**
   - View all commission records
   - Filter by date, carrier, status
   - Show total earned vs unearned

### Medium Term (3-6 Months)
3. **Enhanced Signup Flow**
   - Capture contract_level during registration
   - Capture upline, agency, start_date, resident_state
   - Store in raw_user_meta_data

4. **Monthly Payment Tracking**
   - Manual or automated marking of monthly payments
   - Update months_paid counter
   - Recalculate earned/unearned amounts

### Long Term (6+ Months)
5. **Tax Accounting**
   - Generate monthly earned income reports
   - Track chargebacks as unearned commission
   - Export for tax filing

6. **Chargeback Automation**
   - Auto-create chargeback when policy lapses
   - Calculate unearned amount
   - Update commission record status

---

## Key Decision Log

### Decision 1: Use Existing users View
- **Why**: Already has contract_comp_level field (defaults to 100)
- **Alternative**: Create new user_settings table
- **Rationale**: Don't over-engineer, use what exists

### Decision 2: Fallback to Product Commission
- **Why**: Graceful degradation if comp_guide has no match
- **Alternative**: Fail policy creation if no comp_guide match
- **Rationale**: Better UX, prevents blocking users

### Decision 3: Non-Blocking Commission Creation
- **Why**: Policy creation succeeds even if commission creation fails
- **Alternative**: Atomic transaction (both succeed or both fail)
- **Rationale**: Policy is more critical than commission record, can fix manually

### Decision 4: Defer User Registration Enhancements
- **Why**: Not critical path for fixing commission calculation
- **Alternative**: Update signup flow in same iteration
- **Rationale**: Keep scope focused, reduce complexity

### Decision 5: Manual Contract Level Setup
- **Why**: Admins can set via Supabase dashboard for now
- **Alternative**: Build settings page immediately
- **Rationale**: Faster to production, iterate based on feedback

---

## Open Questions & Assumptions

### Assumptions
- ✅ Users view already exposes contract_comp_level (verified)
- ✅ comp_guide table has data populated for existing products
- ✅ Commission percentage stored as decimal (0.1025 = 102.5%)
- ✅ Monthly premium stored in policies.monthly_premium field
- ✅ Advance months = 9 (industry standard)

### Open Questions
- ❓ What if comp_guide has multiple entries for same product/contract level/date? (ORDER BY effective_date DESC LIMIT 1 handles this)
- ❓ What if user's contract_comp_level is NULL? (COALESCE defaults to 100)
- ❓ Should we validate commission record before creating policy? (No - non-blocking approach)

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review `docs/policy-addition-flow.md`
- [ ] Verify comp_guide table has data
- [ ] Verify users view exposes contract_comp_level
- [ ] Check current policy creation flow works

### Phase 1: useCompGuide Hook
- [ ] Create `src/hooks/comps/useCompGuide.ts`
- [ ] Update `src/hooks/comps/index.ts` exports
- [ ] Write unit tests
- [ ] Test comp_guide query manually
- [ ] Verify caching works

### Phase 2: PolicyForm Integration
- [ ] Import useCompGuide in PolicyForm
- [ ] Get user contract level from useAuth
- [ ] Add useCompGuide hook call
- [ ] Update product selection handler
- [ ] Add useEffect for commission update
- [ ] Test with different contract levels
- [ ] Test fallback to product commission
- [ ] Deploy to staging

### Phase 3: Commission Auto-Creation
- [ ] Update PolicyService.create()
- [ ] Add advance calculation logic
- [ ] Add commission record insertion
- [ ] Update useCreatePolicy invalidation
- [ ] Test locally with different premiums
- [ ] Verify commission records in database
- [ ] Deploy to staging
- [ ] Run end-to-end tests

### Post-Implementation
- [ ] Monitor commission creation success rate
- [ ] Verify commission rates are correct
- [ ] Gather user feedback
- [ ] Plan next iteration (settings page, etc.)

---

## Estimated Timeline

**Total Effort**: 2-3 days

- **Phase 1** (useCompGuide Hook): 2-3 hours
  - Hook creation: 1 hour
  - Testing: 1-2 hours

- **Phase 2** (PolicyForm Integration): 4-6 hours
  - Code changes: 2-3 hours
  - Testing: 2-3 hours

- **Phase 3** (Commission Auto-Creation): 4-6 hours
  - Code changes: 2-3 hours
  - Testing: 2-3 hours

- **Integration & Deployment**: 2-3 hours
  - End-to-end testing: 1-2 hours
  - Deployment & monitoring: 1 hour

**Contingency**: +1 day for edge cases and debugging

---

## References

- **Technical Documentation**: `docs/policy-addition-flow.md`
- **Business Rules**: `docs/commission-lifecycle-business-rules.md`
- **Database Schema**: `supabase/migrations/001_initial_schema.sql`
- **Users View**: `supabase/migrations/20251001_007_SAFE_users_view_corrected.sql`

---

**END OF PLAN**
