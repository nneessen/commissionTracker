# Commission Lifecycle - Business Rules & Calculations

**Author**: Commission Tracker Development Team
**Date**: 2025-10-03
**Status**: AUTHORITATIVE - Official Business Logic Documentation

---

## Overview

This document defines the **official business rules** for commission calculations, earning, and chargebacks in the commission tracking system. All code must adhere to these rules.

---

## Core Principles

### 1. **ONE Formula for Commission Advances**

```
Advance = Monthly Premium × Advance Months × Commission Rate
```

**Example**:
- Monthly Premium: $500
- Advance Months: 9 (industry standard)
- Commission Rate: 102.5% (1.025 as decimal)
- **Advance = $500 × 9 × 1.025 = $4,612.50**

### 2. **Advances Are Paid Upfront, Earned Month-by-Month**

- The agent receives the **advance** upfront when the policy is sold
- The advance is **NOT earned** until the client makes monthly payments
- Each month the client pays = **1/9th** (11.11%) of the advance becomes earned
- This creates an **unearned commission receivable** that must be tracked

### 3. **Chargeback = Unearned Advance**

- When a policy cancels or lapses before the advance is fully earned
- The agent must pay back the **unearned portion**
- Chargeback = Advance - Earned

---

## Detailed Calculations

### Advance Calculation

**Formula**: `Advance = Monthly Premium × Advance Months × Commission Rate`

**Parameters**:
- `monthlyPremium` (number): The monthly premium amount in dollars
- `advanceMonths` (number): Number of months in advance (typically 9)
- `commissionRate` (number): Commission percentage as decimal (1.025 = 102.5%)

**Returns**: `advanceAmount` (number): The upfront commission payment

**Code Example**:
```typescript
import { commissionLifecycleService } from '@/services/commissions/CommissionLifecycleService';

const result = commissionLifecycleService.calculateAdvance({
  monthlyPremium: 500,
  advanceMonths: 9,
  commissionRate: 1.025 // 102.5%
});

console.log(result.advanceAmount); // $4,612.50
console.log(result.monthlyEarningRate); // $512.50 per month
```

---

### Earned Commission Calculation

**Formula**: `Earned = (Advance / Advance Months) × Months Paid`

**Business Logic**:
- Each month the client pays their premium = 1 month of earning progress
- Monthly Earning Rate = Advance / Advance Months
- Earned Amount = Monthly Earning Rate × Months Paid

**Example Progression**:

| Month | Client Paid? | Months Paid | Earned Amount | Unearned Amount |
|-------|-------------|-------------|---------------|-----------------|
| 0     | -           | 0           | $0            | $4,612.50       |
| 1     | ✅ Yes      | 1           | $512.50       | $4,100.00       |
| 2     | ✅ Yes      | 2           | $1,025.00     | $3,587.50       |
| 3     | ✅ Yes      | 3           | $1,537.50     | $3,075.00       |
| 4     | ✅ Yes      | 4           | $2,050.00     | $2,562.50       |
| 5     | ✅ Yes      | 5           | $2,562.50     | $2,050.00       |
| 6     | ✅ Yes      | 6           | $3,075.00     | $1,537.50       |
| 7     | ✅ Yes      | 7           | $3,587.50     | $1,025.00       |
| 8     | ✅ Yes      | 8           | $4,100.00     | $512.50         |
| 9     | ✅ Yes      | 9           | $4,612.50     | $0              |

**Code Example**:
```typescript
// After 3 months of client payments
const result = commissionLifecycleService.calculateEarned({
  advanceAmount: 4612.50,
  advanceMonths: 9,
  monthsPaid: 3
});

console.log(result.earnedAmount); // $1,537.50
console.log(result.unearnedAmount); // $3,075.00
console.log(result.percentageEarned); // 33.33%
console.log(result.isFullyEarned); // false
console.log(result.monthsRemaining); // 6
```

---

### Chargeback Calculation

**Formula**: `Chargeback = Advance - Earned`

**When Chargebacks Occur**:
- Policy cancelled (client requested cancellation)
- Policy lapsed (client stopped paying premiums)
- Policy replaced (client switched to different product/carrier)

**Chargeback Scenarios**:

#### Scenario 1: Policy Lapses at Month 3
```
Advance: $4,612.50
Months Paid: 3
Earned: $1,537.50
Chargeback: $3,075.00 ❌
```

#### Scenario 2: Policy Lapses at Month 6
```
Advance: $4,612.50
Months Paid: 6
Earned: $3,075.00
Chargeback: $1,537.50 ❌
```

#### Scenario 3: Policy Survives 9+ Months
```
Advance: $4,612.50
Months Paid: 9+
Earned: $4,612.50
Chargeback: $0 ✅ (Fully earned!)
```

**Code Example**:
```typescript
const result = commissionLifecycleService.calculateChargeback({
  advanceAmount: 4612.50,
  advanceMonths: 9,
  monthsPaid: 3,
  lapseDate: new Date('2024-04-01'),
  effectiveDate: new Date('2024-01-01')
});

console.log(result.chargebackAmount); // $3,075.00
console.log(result.earnedAmount); // $1,537.50
console.log(result.chargebackReason); // "Policy lapsed early (3 months) - high chargeback"
```

---

## Persistency Metrics

**Definition**: Persistency = Percentage of policies still active at specific milestones

**Why It Matters**:
- Predicts future chargeback rates
- Assesses portfolio quality
- Helps with financial forecasting

**Standard Milestones**:
- 3-month persistency
- 6-month persistency
- 9-month persistency (critical: if policy survives this, no chargeback)
- 12-month persistency

**Example Persistency Analysis**:

```
Cohort: 100 policies started January 2024

3-month (April 2024):  95 active → 95% persistency ✅ Excellent
6-month (July 2024):   88 active → 88% persistency ✅ Good
9-month (October 2024): 82 active → 82% persistency ⚠️ Watch
12-month (January 2025): 78 active → 78% persistency ⚠️ Needs improvement

Predicted chargeback rate: 18% (100 - 82 = 18 policies lapsed before month 9)
```

**Code Example**:
```typescript
const analysis = commissionLifecycleService.calculatePersistencyMetrics(
  policies, // Array of PolicyCohort
  new Date('2024-01-01'), // Cohort start
  new Date('2024-01-31')  // Cohort end
);

console.log(analysis.milestones.threeMonth.persistencyRate); // 95%
console.log(analysis.milestones.nineMonth.persistencyRate); // 82%
console.log(analysis.predictedChargebackRate); // 18%
```

---

## Database Schema Requirements

### Required Fields in `commissions` Table

```sql
-- Core commission data
commission_amount DECIMAL(10,2) NOT NULL,  -- The ADVANCE amount
advance_months INTEGER DEFAULT 9,           -- Number of months in advance
commission_rate DECIMAL(6,4),               -- Commission percentage as decimal

-- Earning tracking (NEW - needs migration)
months_paid INTEGER DEFAULT 0,              -- How many months client has paid
earned_amount DECIMAL(10,2) DEFAULT 0,      -- Amount earned so far
unearned_amount DECIMAL(10,2),              -- Amount still unearned
last_payment_date DATE,                     -- Date of last client payment

-- Chargeback tracking
chargeback_amount DECIMAL(10,2),            -- Chargeback amount if applicable
chargeback_date DATE,                       -- Date of chargeback
chargeback_reason TEXT,                     -- Why chargeback occurred
```

### Calculated Fields (Can be computed views or triggers)

```sql
-- Percentage earned (0-100)
percentage_earned = (months_paid / advance_months) * 100

-- Is fully earned?
is_fully_earned = (months_paid >= advance_months)

-- Chargeback risk level
chargeback_risk = CASE
  WHEN months_paid = 0 THEN 'HIGH'
  WHEN months_paid < 3 THEN 'HIGH'
  WHEN months_paid < 6 THEN 'MEDIUM'
  WHEN months_paid < advance_months THEN 'LOW'
  ELSE 'NONE'
END
```

---

## Integration Points

### When Policy is Created
1. Calculate advance using comp guide rate
2. Store `commission_amount` (the advance)
3. Set `advance_months` (typically 9)
4. Set `months_paid` to 0
5. Set `earned_amount` to 0
6. Set `unearned_amount` to advance

### When Client Makes Payment
1. Increment `months_paid` by 1
2. Recalculate `earned_amount`
3. Recalculate `unearned_amount`
4. Update `last_payment_date`
5. Check if `is_fully_earned`

### When Policy Lapses/Cancels
1. Calculate chargeback based on current `months_paid`
2. Create chargeback record
3. Store `chargeback_amount`
4. Store `chargeback_date`
5. Store `chargeback_reason`
6. Update policy status to 'lapsed' or 'cancelled'

### Monthly Persistency Reporting
1. Group policies by cohort (month started)
2. For each milestone (3mo, 6mo, 9mo, 12mo):
   - Count active policies
   - Count lapsed policies
   - Calculate persistency rate
3. Generate persistency report
4. Predict future chargebacks

---

## Code Usage Examples

### Example 1: Calculate Advance for New Policy

```typescript
import { commissionLifecycleService } from '@/services/commissions/CommissionLifecycleService';

// Policy details
const monthlyPremium = 500;
const compRate = 1.025; // 102.5% from comp guide

// Calculate advance
const advance = commissionLifecycleService.calculateAdvance({
  monthlyPremium,
  advanceMonths: 9,
  commissionRate: compRate
});

console.log(`Advance to pay agent: $${advance.advanceAmount.toFixed(2)}`);
console.log(`Earns $${advance.monthlyEarningRate.toFixed(2)} per month paid`);

// Output:
// Advance to pay agent: $4,612.50
// Earns $512.50 per month paid
```

### Example 2: Track Earning Progress

```typescript
// After 5 months, check earning status
const status = commissionLifecycleService.calculateEarned({
  advanceAmount: 4612.50,
  advanceMonths: 9,
  monthsPaid: 5
});

console.log(`Earned: $${status.earnedAmount.toFixed(2)}`);
console.log(`Unearned: $${status.unearnedAmount.toFixed(2)}`);
console.log(`Progress: ${status.percentageEarned.toFixed(1)}%`);
console.log(`Months remaining: ${status.monthsRemaining}`);

// Output:
// Earned: $2,562.50
// Unearned: $2,050.00
// Progress: 55.6%
// Months remaining: 4
```

### Example 3: Calculate Chargeback When Policy Lapses

```typescript
// Policy lapses after only 2 months - calculate chargeback
const chargeback = commissionLifecycleService.calculateChargeback({
  advanceAmount: 4612.50,
  advanceMonths: 9,
  monthsPaid: 2,
  lapseDate: new Date('2024-03-15'),
  effectiveDate: new Date('2024-01-15')
});

console.log(`Chargeback owed: $${chargeback.chargebackAmount.toFixed(2)}`);
console.log(`Earned amount: $${chargeback.earnedAmount.toFixed(2)}`);
console.log(`Reason: ${chargeback.chargebackReason}`);

// Output:
// Chargeback owed: $3,587.50
// Earned amount: $1,025.00
// Reason: Policy lapsed early (2 months) - high chargeback
```

### Example 4: Assess Chargeback Risk

```typescript
// Check risk level for a commission with 7 months paid
const risk = commissionLifecycleService.getChargebackRisk(7, 9);

console.log(`Risk Level: ${risk.level}`);
console.log(`Description: ${risk.description}`);

// Output:
// Risk Level: low
// Description: 7/9 months paid - low chargeback risk
```

---

## Business Impact

### Financial Implications

**Scenario: 100 policies per month, $500 average premium, 102.5% commission**

```
Monthly advance payout: 100 × $4,612.50 = $461,250
```

**If persistency is 85% at 9 months**:
```
Policies that fully earn: 85
Policies that lapse: 15
Average months paid before lapse: ~4

Total earned: 85 × $4,612.50 = $392,062.50
Chargebacks from 15 lapsed: 15 × $2,050.00 = $30,750.00

Net commission: $392,062.50 - $30,750.00 = $361,312.50
Effective commission rate: 78.3% (vs 85% if no chargebacks)
```

### Key Metrics to Monitor

1. **Persistency Rates**
   - Target: >90% at 3 months
   - Target: >85% at 9 months

2. **Average Months Paid Before Lapse**
   - Higher = less chargeback exposure

3. **Chargeback Rate**
   - Target: <10% of total advances

4. **Unearned Commission Balance**
   - Total exposure to future chargebacks
   - Monitor as % of total portfolio value

---

## Testing Requirements

### Unit Tests Required

1. ✅ Advance calculation with various premiums and rates
2. ✅ Earned calculation for each month (0-12)
3. ✅ Chargeback calculation for various lapse scenarios
4. ✅ Persistency metrics for different cohorts
5. ✅ Edge cases: $0 premium, >100% rates, negative values
6. ✅ Boundary testing: exact 9 months, 10+ months

### Integration Tests Required

1. End-to-end policy creation → advance calculation
2. Monthly payment processing → earned update
3. Policy lapse → chargeback creation
4. Persistency report generation

---

## Glossary

**Advance**: Upfront commission payment to agent

**Earned Commission**: Portion of advance that has been earned through client payments

**Unearned Commission**: Portion of advance not yet earned (receivable)

**Chargeback**: Amount agent must repay when policy lapses before advance is fully earned

**Persistency**: Percentage of policies still active at a specific time

**Cohort**: Group of policies started in the same time period

**Advance Months**: Number of months of premium included in advance (typically 9)

**Monthly Earning Rate**: Amount of advance earned per client payment (advance / advance months)

---

**This is the authoritative source for all commission calculations. All code must align with these business rules.**

**Last Updated**: 2025-10-03
**Next Review**: Quarterly or when business rules change
