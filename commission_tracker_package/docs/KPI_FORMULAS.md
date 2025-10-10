# KPI Formulas - Mathematical Definitions

This document provides the mathematical formulas for all Key Performance Indicators (KPIs) in the Commission Tracker application.

## Table of Contents
1. [Commission Calculations](#commission-calculations)
2. [Time Period Scaling](#time-period-scaling)
3. [Financial KPIs](#financial-kpis)
4. [Production KPIs](#production-kpis)
5. [Client KPIs](#client-kpis)
6. [Missing KPIs (To Implement)](#missing-kpis-to-implement)

---

## Commission Calculations

### 1. Earned Commission Amount
**Formula:**
```
earned_amount = (total_advance / advance_months) × months_paid
```

**Where:**
- `total_advance` = Total commission advance received upfront
- `advance_months` = Number of months the advance covers (typically 9)
- `months_paid` = Number of months the policy has been active with payments

**Example:**
```
Advance: $10,000
Advance Months: 9
Months Paid: 3

earned_amount = ($10,000 / 9) × 3 = $1,111.11 × 3 = $3,333.33
```

**Database Implementation:**
```sql
CREATE OR REPLACE FUNCTION calculate_earned_amount(
  p_amount DECIMAL,
  p_advance_months INTEGER,
  p_months_paid INTEGER
) RETURNS DECIMAL AS $$
DECLARE
  v_monthly_earning_rate DECIMAL;
  v_earned_amount DECIMAL;
  v_effective_months_paid INTEGER;
BEGIN
  -- Cap months paid at advance months
  v_effective_months_paid := LEAST(p_months_paid, p_advance_months);

  -- Calculate monthly earning rate
  v_monthly_earning_rate := p_amount / p_advance_months;

  -- Calculate earned amount
  v_earned_amount := v_monthly_earning_rate * v_effective_months_paid;

  RETURN v_earned_amount;
END;
$$ LANGUAGE plpgsql;
```

### 2. Unearned Commission Amount
**Formula:**
```
unearned_amount = total_advance - earned_amount
```

**Example:**
```
Advance: $10,000
Earned: $3,333.33

unearned_amount = $10,000 - $3,333.33 = $6,666.67
```

### 3. Commission Percentage (Rate)
**Formula:**
```
commission_rate = commission_amount / annual_premium
```

**Example:**
```
Annual Premium: $10,000
Commission: $9,500

commission_rate = $9,500 / $10,000 = 0.95 (95%)
```

### 4. Average Commission per Policy
**Formula:**
```
avg_commission = total_commissions_earned / number_of_policies
```

**Example:**
```
Total Earned: $50,000
Policies: 25

avg_commission = $50,000 / 25 = $2,000 per policy
```

---

## Time Period Scaling

### CRITICAL: How to Scale Metrics by Time Period

**Problem:** Monthly expenses of $4,000 should show as ~$923/week, not $4,000

**Solution:** Use period conversion factors

### Conversion Factors
```typescript
const DAYS_PER_PERIOD = {
  daily: 1,
  weekly: 7,
  monthly: 30.44,  // Average days per month
  yearly: 365.25   // Account for leap years
};

const WEEKS_PER_PERIOD = {
  daily: 1/7,
  weekly: 1,
  monthly: 4.33,   // 30.44 / 7
  yearly: 52.18    // 365.25 / 7
};

const MONTHS_PER_PERIOD = {
  daily: 1/30.44,
  weekly: 7/30.44,
  monthly: 1,
  yearly: 12
};
```

### Scaling Formula
```typescript
function scaleMetricByPeriod(
  value: number,
  fromPeriod: TimePeriod,
  toPeriod: TimePeriod
): number {
  const fromDays = DAYS_PER_PERIOD[fromPeriod];
  const toDays = DAYS_PER_PERIOD[toPeriod];

  return (value / fromDays) * toDays;
}
```

### Examples

**1. Monthly Expenses → Weekly Display**
```
Monthly Expense: $4,000
Days in Month: 30.44
Days in Week: 7

Weekly Expense = ($4,000 / 30.44) × 7 = $131.23 × 7 = $918.60
```

**2. Weekly Target → Daily Target**
```
Weekly Target: 10 policies
Days in Week: 7

Daily Target = 10 / 7 = 1.43 policies per day
```

**3. Yearly Goal → Monthly Pace**
```
Yearly Goal: $500,000 commission
YTD Earned: $200,000
Months Remaining: 6

Monthly Pace Needed = ($500,000 - $200,000) / 6 = $50,000/month
```

---

## Financial KPIs

### 1. Net Income
**Formula:**
```
net_income = commissions_earned - total_expenses
```

**Example:**
```
Commissions Earned: $50,000
Total Expenses: $35,000

net_income = $50,000 - $35,000 = $15,000
```

### 2. Profit Margin
**Formula:**
```
profit_margin = (net_income / commissions_earned) × 100
```

**Example:**
```
Net Income: $15,000
Commissions Earned: $50,000

profit_margin = ($15,000 / $50,000) × 100 = 30%
```

### 3. Surplus/Deficit
**Formula:**
```
surplus_deficit = commissions_earned - total_expenses

If positive: surplus (profit)
If negative: deficit (loss)
```

### 4. Breakeven Amount Needed
**Formula:**
```
breakeven_needed = MAX(0, total_expenses - commissions_earned)
```

**Example:**
```
Expenses: $4,000
Commissions: $2,500

breakeven_needed = MAX(0, $4,000 - $2,500) = $1,500
```

### 5. Policies Needed to Break Even
**Formula:**
```
policies_needed = CEILING(breakeven_needed / avg_commission_per_policy)
```

**Example:**
```
Breakeven Needed: $1,500
Avg Commission: $400

policies_needed = CEILING($1,500 / $400) = CEILING(3.75) = 4 policies
```

### 6. ROI (Return on Investment)
**Formula:**
```
ROI = ((commissions_earned - total_expenses) / total_expenses) × 100
```

**Example:**
```
Commissions: $50,000
Expenses: $35,000

ROI = (($50,000 - $35,000) / $35,000) × 100 = 42.86%
```

---

## Production KPIs

### 1. Premium Written
**Formula:**
```
premium_written = SUM(annual_premium) WHERE effective_date IN period
```

### 2. Average Premium
**Formula:**
```
avg_premium = total_premium_written / number_of_policies
```

**Example:**
```
Total Premium: $250,000
Policies: 50

avg_premium = $250,000 / 50 = $5,000
```

### 3. Commissionable Value
**Formula:**
```
commissionable_value = SUM(annual_premium × commission_rate) for all policies
```

**Example:**
```
Policy 1: $10,000 × 0.95 = $9,500
Policy 2: $15,000 × 0.90 = $13,500
Total: $23,000
```

### 4. Case Size Trend
**Formula:**
```
case_size_trend = (current_period_avg_premium - previous_period_avg_premium) / previous_period_avg_premium × 100
```

**Example:**
```
Current Month Avg: $6,000
Last Month Avg: $5,000

trend = ($6,000 - $5,000) / $5,000 × 100 = 20% increase
```

---

## Client KPIs

### 1. Retention Rate
**Formula:**
```
retention_rate = (active_policies / total_policies_ever_written) × 100
```

**Example:**
```
Active Policies: 80
Total Policies Ever: 100

retention_rate = (80 / 100) × 100 = 80%
```

### 2. Lapse Rate
**Formula:**
```
lapse_rate = (lapsed_policies_in_period / new_policies_in_period) × 100
```

**Example:**
```
Lapsed this Month: 2
New Policies this Month: 20

lapse_rate = (2 / 20) × 100 = 10%
```

### 3. Cancellation Rate
**Formula:**
```
cancellation_rate = (cancelled_policies_in_period / new_policies_in_period) × 100
```

### 4. Policies per Client
**Formula:**
```
policies_per_client = total_policies / unique_clients
```

**Example:**
```
Total Policies: 150
Unique Clients: 100

policies_per_client = 150 / 100 = 1.5 policies/client
```

### 5. Average Client Value
**Formula:**
```
avg_client_value = total_premium_value / number_of_clients
```

**Example:**
```
Total Premium: $500,000
Clients: 100

avg_client_value = $500,000 / 100 = $5,000 per client
```

---

## Pace Metrics

### 1. Daily Production Target
**Formula:**
```
daily_target = (period_goal - period_actual) / business_days_remaining
```

**Example:**
```
Monthly Goal: 20 policies
MTD Sold: 12
Business Days Left: 10

daily_target = (20 - 12) / 10 = 0.8 policies/day
```

### 2. Weekly Production Pace
**Formula:**
```
weekly_pace = daily_target × 5  // 5 business days per week
```

### 3. Run Rate (Annualized)
**Formula:**
```
annual_run_rate = (mtd_actual / days_elapsed) × 365
```

**Example:**
```
MTD Commission: $10,000
Days Elapsed: 15

annual_run_rate = ($10,000 / 15) × 365 = $666.67 × 365 = $243,333
```

---

## Missing KPIs (To Implement)

### 1. Customer Acquisition Cost (CAC)
**Formula:**
```
CAC = (total_marketing_spend + total_sales_costs) / new_clients_acquired
```

**What's Needed:**
- Track marketing expenses separately
- Tag expenses as "acquisition costs"
- Link expenses to campaigns/sources

**Example:**
```
Marketing Spend: $5,000
Sales Costs: $3,000
New Clients: 20

CAC = ($5,000 + $3,000) / 20 = $400 per client
```

### 2. Lifetime Value (LTV)
**Formula:**
```
LTV = avg_annual_premium × avg_commission_rate × avg_client_lifespan_years
```

**What's Needed:**
- Calculate average client lifespan (from historical data)
- Track churn rate to estimate lifespan

**Example:**
```
Avg Premium: $5,000
Avg Commission Rate: 95%
Avg Lifespan: 7 years

LTV = $5,000 × 0.95 × 7 = $33,250
```

### 3. LTV:CAC Ratio
**Formula:**
```
LTV_CAC_ratio = LTV / CAC
```

**Benchmark:**
- Ratio > 3:1 is healthy
- Ratio < 3:1 means spending too much on acquisition

**Example:**
```
LTV: $33,250
CAC: $400

Ratio = $33,250 / $400 = 83:1 (excellent!)
```

### 4. Persistency Rate (Cohort-Based)
**Formula:**
```
13_month_persistency = (active_policies_at_13mo / policies_written_in_cohort) × 100
```

**What's Needed:**
- Track policy cohorts by month/quarter written
- Calculate active policies at 13, 25, 37 months

**Example:**
```
January 2024 Cohort: 50 policies written
Active at 13 months: 42

13_month_persistency = (42 / 50) × 100 = 84%
```

### 5. Conversion Funnel Metrics
**Stages:**
1. Leads generated
2. Appointments set
3. Applications submitted
4. Policies issued

**Formulas:**
```
lead_to_appointment = (appointments / leads) × 100
appointment_to_app = (applications / appointments) × 100
app_to_policy = (policies / applications) × 100
overall_conversion = (policies / leads) × 100
```

**What's Needed:**
- Add `leads` table
- Add `appointments` table
- Add `applications` table
- Link all to final policy

### 6. Average Time to Close
**Formula:**
```
avg_time_to_close = AVG(effective_date - lead_created_date) in days
```

**What's Needed:**
- Track lead creation date
- Track appointment date
- Track application date
- Calculate duration between stages

---

## Implementation Priority

### Phase 1: Fix Existing KPIs (Immediate)
1. Fix time period scaling in `useMetricsWithDateRange.ts`
2. Use correct commission fields (`amount`, `earned_amount`, `unearned_amount`)
3. Remove duplicate metrics from dashboard

### Phase 2: Add Missing Critical KPIs (Week 1)
1. Customer Acquisition Cost (CAC)
2. Lifetime Value (LTV)
3. LTV:CAC Ratio
4. Persistency cohort analysis

### Phase 3: Add Sales Funnel (Week 2-3)
1. Create leads/appointments/applications tables
2. Implement conversion funnel tracking
3. Calculate conversion rates
4. Track time-to-close metrics

### Phase 4: Advanced Analytics (Month 2)
1. Predictive analytics (forecasting)
2. Goal tracking and progress
3. Performance benchmarking
4. Anomaly detection

---

## Testing Formulas

When implementing these formulas, test with known values:

**Test Case 1: Simple Commission**
```
Input:
  - Annual Premium: $10,000
  - Commission Rate: 95%
  - Advance Months: 9
  - Months Paid: 3

Expected Output:
  - Total Commission: $9,500
  - Monthly Earning: $1,055.56
  - Earned Amount: $3,166.67
  - Unearned Amount: $6,333.33
```

**Test Case 2: Time Period Scaling**
```
Input:
  - Monthly Expense: $4,000
  - Target Period: Weekly

Expected Output:
  - Weekly Expense: $923.23
  - Daily Expense: $131.89
```

**Test Case 3: Breakeven Calculation**
```
Input:
  - Monthly Expenses: $5,000
  - MTD Commission: $3,000
  - Avg Commission per Policy: $400

Expected Output:
  - Surplus/Deficit: -$2,000 (deficit)
  - Breakeven Needed: $2,000
  - Policies Needed: 5
```

---

## Notes for LLM/Engineer

1. **All formulas assume period-filtered data** - Make sure to filter policies/commissions/expenses by the selected time period before calculating.

2. **Scaling is critical** - Without proper time period scaling, the dashboard is misleading. A monthly expense of $4,000 is NOT a weekly expense of $4,000.

3. **Database vs Frontend calculations** - Commission earned/unearned should be calculated in the database (already implemented). Frontend should display, not recalculate.

4. **Handle division by zero** - Always check denominators before dividing (e.g., `policies > 0` before calculating averages).

5. **Use consistent precision** - Financial values should be stored as DECIMAL(10,2), displayed with 2 decimal places. Percentages displayed with 1 decimal place.

6. **Annualized metrics** - When showing run rates, clearly label as "annualized" or "projected annual" to avoid confusion.
