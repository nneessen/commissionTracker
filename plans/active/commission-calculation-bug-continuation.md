# Commission Calculation Bug - Continuation Prompt

## Session Date: 2026-01-08

## Problem Status: ROOT CAUSE IDENTIFIED

### Original Issue
When users add policies, the commission calculation uses the wrong product compensation rate based on their contract level.

### Current Test Case (FAILING)
- **User**: nickneessen@thestandardhq.com
- **User's Contract Level**: 120 (stored in user_profiles table)
- **Product Selected**: Transamerica Trendsetter LB
- **Expected Comp Rate**: 95%
- **Actual Comp Rate Displayed**: 85%
- **Also**: SBLI Term shows 105% instead of 125%

## ROOT CAUSE IDENTIFIED

**The `contract_level` is being read from auth USER METADATA, not from the user_profiles TABLE!**

In `src/services/users/userService.ts` line 815:
```typescript
contract_level: (metadata.contract_level as number) || null,
```

This reads from `auth.users.raw_user_meta_data.contract_level`, which is likely NULL.

In `src/features/policies/PolicyForm.tsx` line 57:
```typescript
const userContractLevel = user?.contract_level || 100;
```

Since `user.contract_level` is `null` (from auth metadata), it defaults to 100!

### What's happening:
1. User's actual contract_level = 120 (stored in user_profiles table)
2. AuthContext reads from auth.users metadata → contract_level = null
3. PolicyForm sees null → defaults to 100
4. comp_guide query uses contract_level=100 instead of 120
5. Wrong commission rate is returned (85% instead of 95%)

## FIX APPLIED

Added code to `PolicyForm.tsx` to fetch the user's contract_level directly from the `user_profiles` table:

```typescript
// CRITICAL FIX: Fetch contract_level from user_profiles table, not auth metadata
const [dbContractLevel, setDbContractLevel] = useState<number | null>(null);

useEffect(() => {
  const fetchContractLevel = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("contract_level")
      .eq("id", user.id)
      .single();

    if (!error && data?.contract_level) {
      setDbContractLevel(data.contract_level);
    }
  };

  fetchContractLevel();
}, [user?.id]);

// Use DB contract_level if available, fall back to auth metadata, then default to 100
const userContractLevel = dbContractLevel || user?.contract_level || 100;
```

### What Was Done in Previous Session

Modified 6 files to pass `productId` through the commission calculation chain:

1. `src/services/commissions/CommissionCRUDService.ts:33` - Added `productId?: string` to CreateCommissionData
2. `src/services/policies/policyService.ts:143` - Pass `productId` to commission creation
3. `src/services/settings/comp-guide/CompGuideRepository.ts:306-332` - Added `getCommissionRateByProductId()` method
4. `src/services/settings/comp-guide/CompGuideService.ts:290-343` - Updated `getCommissionRate()` to use `productId`
5. `src/services/commissions/CommissionCalculationService.ts:97,180,310` - Accept/pass `productId`
6. `src/services/commissions/commissionService.ts:84` - Updated facade signature

### Why It's Still Not Working

The changes were focused on the **backend commission creation** flow, but the **PolicyForm frontend preview** uses a different code path:

**PolicyForm.tsx (lines 164-193)** fetches rates in a useEffect:
```typescript
for (const product of products) {
  const { data } = await supabase
    .from("comp_guide")
    .select("commission_percentage")
    .eq("product_id", product.id)
    .eq("contract_level", userContractLevel)  // <-- Using user's contract level (120)
    .lte("effective_date", today)
    .or(`expiration_date.is.null,expiration_date.gte.${today}`)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
```

This query should be finding the correct rate, but it's returning 85% instead of 95%.

### Likely Root Causes to Investigate

1. **comp_guide data issue**: Does the comp_guide table have an entry for Transamerica Trendsetter LB at contract_level=120 with commission_percentage=0.95?

2. **Multiple entries returning wrong one**: Are there multiple comp_guide entries and the query is returning the wrong one?

3. **product_id mismatch**: Is the product_id being used correctly? Check if the Transamerica Trendsetter LB product has the correct ID linked to comp_guide.

4. **Fallback to product.commission_percentage**: If no comp_guide entry is found, it falls back to `product.commission_percentage` which might be 85%.

### Immediate Debug Steps

1. Query the database directly to see what comp_guide entries exist for Transamerica Trendsetter LB:
```sql
SELECT cg.*, p.name as product_name, c.name as carrier_name
FROM comp_guide cg
JOIN products p ON cg.product_id = p.id
JOIN carriers c ON cg.carrier_id = c.id
WHERE p.name ILIKE '%trendsetter%'
ORDER BY cg.contract_level;
```

2. Check the user's actual contract_level:
```sql
SELECT id, email, contract_level
FROM user_profiles
WHERE email = 'nickneessen@thestandardhq.com';
```

3. Check if the product dropdown is using the correct product_id when displaying rates.

### Files to Focus On

- `src/features/policies/PolicyForm.tsx` - Frontend rate display (lines 164-193, 195-218)
- `src/hooks/comps/useCompGuide.ts` - Hook that fetches comp guide data
- `src/services/settings/comp-guide/CompGuideRepository.ts` - New method may need debugging
- The actual comp_guide table data

### Key Questions to Answer

1. What does the comp_guide table actually contain for this product/contract_level combination?
2. Is the user's contract_level being read correctly (should be 120)?
3. Is the query returning data at all, or falling back to product defaults?
4. What is the product.commission_percentage for Transamerica Trendsetter LB?

### Contract Level → Commission Rate Mapping

The comp_guide table stores commission rates indexed by contract_level. For a user with contract_level=120:
- Query should find: `WHERE product_id='X' AND contract_level=120`
- Should return: commission_percentage for that tier (expected: 0.95 for 95%)

If returning 85% (0.85), either:
- No entry exists at contract_level=120 for this product
- Entry exists but has wrong commission_percentage value
- Query is matching a different contract_level entry
- Fallback is being used

## Next Steps

1. Debug the actual database state
2. Add console logging to see what values are being queried/returned
3. Fix the root cause (likely data or query issue)
4. Test with the specific user/product combination
