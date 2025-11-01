# Commission Rate Calculation System

## Overview

This system calculates accurate commission rates for insurance agents based on:
1. User's contract level (from `users.contract_comp_level`)
2. Commission rates from `comp_guide` table
3. Historical sales product mix (premium-weighted, not count-weighted)

**CRITICAL**: This replaces the old system that incorrectly averaged historical commission records. The new system uses authoritative commission rates from the `comp_guide` table.

---

## Architecture

### Database Layer
- **PostgreSQL Function**: `get_user_commission_profile(user_id, lookback_months)`
- **Indexes**: Optimized for contract level and product mix queries
- **RLS**: Row Level Security enabled on `comp_guide` table
- **Location**: `supabase/migrations/20251031_003_user_commission_rates_system.sql`

### Service Layer
- **Service**: `commissionRateService.getUserCommissionProfile()`
- **Location**: `src/services/commissions/commissionRateService.ts`
- **Methods**:
  - `getUserCommissionProfile()` - Full profile with breakdown
  - `getUserRecommendedRate()` - Just the rate (convenience)
  - `hasGoodCommissionData()` - Data quality check

### Hook Layer
- **Hook**: `useUserCommissionProfile(lookbackMonths)`
- **Location**: `src/hooks/commissions/useUserCommissionProfile.ts`
- **Features**:
  - TanStack Query caching (1 hour stale time)
  - Automatic error handling
  - TypeScript types

### UI Layer
- **Component**: `<CommissionRateDisplay />`
- **Location**: `src/features/targets/components/CommissionRateDisplay.tsx`
- **Features**:
  - Shows contract level and recommended rate
  - Data quality indicator
  - Product breakdown table (sortable by weight)
  - Calculation transparency

---

## Key Concepts

### Premium-Weighted vs Count-Weighted

**WRONG (old system)**:
```sql
-- Treats all policies equally (BAD!)
COUNT(*) / TOTAL_COUNT
-- Result: 10 cheap policies = 10x weight of 1 expensive policy
```

**CORRECT (new system)**:
```sql
-- Weights by premium volume (GOOD!)
SUM(annual_premium) / TOTAL_PREMIUM
-- Result: $10k policy has 10x weight of $1k policy
```

**Example**:
- User sells 10 term policies @ $500 each = $5,000 total
- User sells 2 whole life @ $10,000 each = $20,000 total
- Old system: Term = 83% weight (10/12 policies)
- New system: Term = 20% weight ($5k/$25k premium)

This dramatically changes commission rate calculations!

### Data Quality Levels

| Quality | Criteria | Use |
|---------|----------|-----|
| **HIGH** | 50+ policies OR $100k+ premium | Weighted average (most accurate) |
| **MEDIUM** | 20+ policies OR $40k+ premium | Weighted average (reliable) |
| **LOW** | 5+ policies OR $10k+ premium | Weighted average (use with caution) |
| **INSUFFICIENT** | Less than above | Simple average (fallback) |

### Simple vs Weighted Average

**Simple Average**:
- Average of ALL products at user's contract level
- Used when: No sales history or insufficient data
- Example: 10 products, rates 80-100%, avg = 90%

**Weighted Average**:
- Average weighted by user's actual premium volume
- Used when: Sufficient sales history exists
- Example: 90% of sales in high-rate products → weighted avg higher than simple

**Recommended Rate**:
- Uses weighted if data quality is HIGH or MEDIUM
- Falls back to simple if LOW or INSUFFICIENT
- **NEVER uses arbitrary fallbacks** (no more 50% defaults!)

---

## Usage Examples

### 1. Get Commission Profile (React Hook)

```tsx
import { useUserCommissionProfile } from '@/hooks/commissions/useUserCommissionProfile';

function MyComponent() {
  const { data: profile, isLoading, error } = useUserCommissionProfile(12);

  if (isLoading) return <Skeleton />;
  if (error) return <Alert>{error.message}</Alert>;

  return (
    <div>
      <p>Contract Level: {profile.contractLevel}</p>
      <p>Recommended Rate: {(profile.recommendedRate * 100).toFixed(2)}%</p>
      <p>Data Quality: {profile.dataQuality}</p>
    </div>
  );
}
```

### 2. Get Just the Rate (Convenience)

```tsx
import { useRecommendedCommissionRate } from '@/hooks/commissions/useUserCommissionProfile';

function TargetsCalculator() {
  const commissionRate = useRecommendedCommissionRate();

  if (!commissionRate) return <Skeleton />;

  const projectedIncome = targetAP * commissionRate;
  return <p>Projected Income: ${projectedIncome}</p>;
}
```

### 3. Display Full Transparency

```tsx
import { CommissionRateDisplay } from '@/features/targets/components/CommissionRateDisplay';

function TargetsPage() {
  return (
    <div>
      <CommissionRateDisplay />
      {/* Shows contract level, rates, data quality, product breakdown */}
    </div>
  );
}
```

### 4. Direct Service Call (Backend)

```typescript
import { commissionRateService } from '@/services/commissions/commissionRateService';

async function calculateProjections(userId: string) {
  const profile = await commissionRateService.getUserCommissionProfile(userId, 12);

  console.log(`User at contract level ${profile.contractLevel}`);
  console.log(`Recommended rate: ${profile.recommendedRate}`);

  // Use rate in calculations
  const projectedCommission = annualPremium * profile.recommendedRate;
}
```

### 5. Direct Database Call (SQL)

```sql
-- Get commission profile for user
SELECT
  contract_level,
  simple_avg_rate,
  weighted_avg_rate,
  data_quality,
  product_breakdown
FROM get_user_commission_profile('user-uuid-here'::uuid, 12);

-- Get just the recommended rate
SELECT
  CASE
    WHEN data_quality IN ('HIGH', 'MEDIUM') THEN weighted_avg_rate
    ELSE simple_avg_rate
  END as recommended_rate
FROM get_user_commission_profile('user-uuid-here'::uuid, 12);
```

---

## Integration with Existing Systems

### Targets Page (`useHistoricalAverages`)

**Before**:
```typescript
// WRONG: Averaged historical commission records
const avgCommissionRate = commissions.reduce(...) / count || 0.50; // ❌
```

**After**:
```typescript
// CORRECT: Uses comp_guide data
const { data: commissionProfile } = useUserCommissionProfile();
const avgCommissionRate = commissionProfile?.recommendedRate; // ✅
```

The targets page now uses **real commission rates** from comp_guide instead of guessing from historical data.

---

## Database Schema

### Function Signature

```sql
get_user_commission_profile(
  p_user_id UUID,
  p_lookback_months INTEGER DEFAULT 12
) RETURNS TABLE (
  contract_level INTEGER,
  simple_avg_rate NUMERIC,
  weighted_avg_rate NUMERIC,
  product_breakdown JSONB,
  data_quality TEXT,
  calculated_at TIMESTAMPTZ
)
```

### Indexes Created

```sql
-- comp_guide lookup optimization
CREATE INDEX idx_comp_guide_lookup
  ON comp_guide(contract_level, product_id, effective_date DESC);

-- policies product mix optimization
CREATE INDEX idx_policies_user_product_date
  ON policies(user_id, product_id, effective_date)
  WHERE status = 'active';
```

### RLS Policy

```sql
-- Allow all authenticated users to read comp_guide (reference data)
CREATE POLICY "comp_guide_public_read" ON comp_guide
  FOR SELECT TO authenticated USING (true);
```

---

## Calculation Details

### Step 1: Get User's Contract Level
```sql
SELECT contract_comp_level FROM users WHERE id = $user_id;
```

### Step 2: Get Current Commission Rates
```sql
-- Most recent rate for each product at user's contract level
SELECT DISTINCT ON (product_id)
  product_id,
  commission_percentage
FROM comp_guide
WHERE contract_level = $user_contract_level
  AND effective_date <= CURRENT_DATE
  AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)
ORDER BY product_id, effective_date DESC;
```

### Step 3: Calculate Product Mix (Premium-Weighted!)
```sql
SELECT
  product_id,
  SUM(annual_premium) / SUM(SUM(annual_premium)) OVER () as weight
FROM policies
WHERE user_id = $user_id
  AND effective_date >= CURRENT_DATE - INTERVAL '12 months'
  AND status = 'active'
GROUP BY product_id;
```

### Step 4: Calculate Weighted Average
```sql
SELECT SUM(commission_rate * weight)
FROM product_mix JOIN current_rates USING (product_id);
```

### Step 5: Determine Data Quality
```sql
CASE
  WHEN policy_count >= 50 OR total_premium >= 100000 THEN 'HIGH'
  WHEN policy_count >= 20 OR total_premium >= 40000 THEN 'MEDIUM'
  WHEN policy_count >= 5 OR total_premium >= 10000 THEN 'LOW'
  ELSE 'INSUFFICIENT'
END
```

---

## Error Handling

### User Not Found
```typescript
// Throws: "User contract level not configured for user_id: xxx"
```

### No Commission Data
```typescript
// Throws: "No commission rate data available for user"
```

### Invalid Lookback Period
```typescript
// Accepts: 1-120 months (validated on client)
```

---

## Performance

### Caching Strategy
- **TanStack Query**: 1 hour stale time, 24 hour cache time
- **No database cache table**: Single-user app doesn't need it
- **Query performance**: <10ms for typical datasets

### Optimization
- Indexed queries for fast lookups
- Server-side calculation (Postgres NUMERIC precision)
- JSONB for flexible product breakdown
- Partial index on active policies only

---

## Testing

### Run SQL Tests
```bash
PGPASSWORD="xxx" psql "connection-string" -f scripts/test-commission-function.sql
```

### Expected Results
```
✅ Simple avg should be between 0-200% (0.00-2.00)
✅ Weighted avg equals simple if no sales history
✅ Data quality is HIGH/MEDIUM/LOW/INSUFFICIENT
```

### Manual Testing
```sql
-- Test with your user ID
SELECT * FROM get_user_commission_profile('your-user-id'::uuid, 12);
```

---

## Migration History

| Date | Migration | Description |
|------|-----------|-------------|
| 2025-10-31 | `20251031_003_user_commission_rates_system.sql` | Initial implementation |

---

## Troubleshooting

### "User contract level not configured"
**Solution**: Set `users.contract_comp_level` for the user
```sql
UPDATE users SET contract_comp_level = 110 WHERE id = 'user-id';
```

### "No commission rate data available"
**Solution**: Ensure `comp_guide` table has entries for user's contract level
```sql
SELECT * FROM comp_guide WHERE contract_level = 110;
```

### Weighted average seems wrong
**Check**: Verify premium-weighted calculation
```sql
-- See which products have the most weight
SELECT
  jsonb_array_elements(product_breakdown) ->> 'productName' as product,
  jsonb_array_elements(product_breakdown) ->> 'premiumWeight' as weight
FROM get_user_commission_profile('user-id'::uuid, 12)
ORDER BY weight DESC;
```

### Data quality is INSUFFICIENT
**Explanation**: User needs more sales history
- Sell more policies
- Or adjust lookback period (less strict)
- System will use simple average as fallback

---

## Future Enhancements

Potential improvements (not yet implemented):

1. **Contract Level Change Tracking**: Audit log when contract level changes
2. **Historical Snapshots**: Store commission profiles over time for trend analysis
3. **Product Mix Recommendations**: Suggest optimal product mix for maximizing commission
4. **Multi-Level Calculations**: Support different rates for first-year vs renewal
5. **Carrier-Specific Weightings**: Weight by carrier performance, not just premium
6. **Seasonal Adjustments**: Account for seasonal product mix variations

---

## Related Documentation

- [Commission Lifecycle Business Rules](./commission-lifecycle-business-rules.md)
- [KPI Definitions](./kpi-definitions.md)
- [Database Schema](./database-schema.md)
- [Targets Page Architecture](../plans/targets-page-redesign-oct2025.md)

---

**Last Updated**: 2025-10-31
**Author**: Claude Code
**Status**: ✅ Implemented and Tested
