# KPI Definitions

**Key Performance Indicators for Insurance Sales Tracking**

All KPIs are calculated from the `policies` table in Supabase database.

---

## Core Metrics

### 1. Average Annual Premium (Avg AP)

**Definition**: Average annual premium across active policies

**Formula**:
```sql
SELECT AVG(annual_premium)
FROM policies
WHERE status = 'active' AND user_id = auth.uid()
```

**Use Case**: Understanding average policy size, calculating pace metrics

**Example**: 100 policies, total $500,000 → Avg AP = $5,000

---

### 2. Persistency Rate

**Definition**: Percentage of policies still active at specific milestones

**Formula**:
```sql
-- 9-month persistency
SELECT
  COUNT(*) FILTER (WHERE status = 'active' AND months_since_start >= 9) * 100.0 /
  COUNT(*) FILTER (WHERE months_since_start >= 9)
FROM policies
WHERE user_id = auth.uid()
```

**Milestones**:
- 3-month: Early indicator of quality
- 6-month: Mid-term health check
- **9-month: Critical** (if policy survives, no chargeback on 9-month advance)
- 12-month: Long-term success

**Example**: 100 policies started Jan → 82 still active at 9 months → 82% persistency

**Targets**:
- 3-month: >95% (excellent)
- 9-month: >85% (good)
- 12-month: >80% (sustainable)

---

### 3. Policies Sold

**Total Policies**:
```sql
SELECT COUNT(*) FROM policies WHERE user_id = auth.uid()
```

**By Status**:
```sql
SELECT status, COUNT(*)
FROM policies
WHERE user_id = auth.uid()
GROUP BY status
```

**By Time Period**:
```sql
SELECT COUNT(*)
FROM policies
WHERE user_id = auth.uid()
  AND effective_date >= '2025-01-01'
  AND effective_date < '2025-02-01'
```

---

### 4. Pace Metrics

**Definition**: Policies needed per time period to hit annual goals

**Formula**:
```
Policies Per Week Needed =
  (Annual Target Premium - YTD Premium) / Weeks Remaining / Avg AP
```

**Example**:
- Annual Target: $500,000
- YTD Premium (6 months): $200,000
- Remaining: $300,000
- Weeks Left: 26
- Avg AP: $5,000
- **Pace: $300,000 / 26 / $5,000 = 2.3 policies/week**

**SQL Implementation**:
```sql
WITH metrics AS (
  SELECT
    SUM(annual_premium) as ytd_premium,
    AVG(annual_premium) as avg_ap
  FROM policies
  WHERE status = 'active'
    AND user_id = auth.uid()
    AND effective_date >= date_trunc('year', CURRENT_DATE)
)
SELECT
  (500000 - ytd_premium) / 26 / avg_ap as policies_per_week_needed
FROM metrics
```

---

### 5. State Performance

**Definition**: KPIs grouped by client state

**Formula**:
```sql
SELECT
  c.state,
  COUNT(p.id) as total_policies,
  SUM(p.annual_premium) as total_premium,
  AVG(p.annual_premium) as avg_premium,
  COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
  COUNT(*) FILTER (WHERE p.status = 'lapsed') as lapsed_policies
FROM policies p
JOIN clients c ON p.client_id = c.id
WHERE p.user_id = auth.uid()
GROUP BY c.state
ORDER BY total_premium DESC
```

**Use Case**:
- Identify strongest markets
- Focus marketing efforts
- Understand regional patterns

---

### 6. Carrier Performance

**Definition**: Metrics by insurance carrier

**Formula**:
```sql
SELECT
  ca.name as carrier,
  COUNT(p.id) as total_policies,
  SUM(p.annual_premium) as total_premium,
  AVG(p.annual_premium) as avg_premium,
  SUM(p.annual_premium * p.commission_percentage) as total_commission
FROM policies p
JOIN carriers ca ON p.carrier_id = ca.id
WHERE p.user_id = auth.uid() AND p.status = 'active'
GROUP BY ca.name
ORDER BY total_premium DESC
```

---

### 7. Product Performance

**Definition**: Metrics by product type (whole life, term, etc.)

**Formula**:
```sql
SELECT
  product,
  COUNT(*) as total_policies,
  SUM(annual_premium) as total_premium,
  AVG(annual_premium) as avg_premium
FROM policies
WHERE user_id = auth.uid() AND status = 'active'
GROUP BY product
ORDER BY total_premium DESC
```

---

## Commission Metrics

### 8. Total Commission

**Earned Commission**:
```sql
SELECT SUM(earned_amount)
FROM commissions
WHERE user_id = auth.uid()
```

**Unearned (At Risk)**:
```sql
SELECT SUM(unearned_amount)
FROM commissions
WHERE user_id = auth.uid() AND months_paid < advance_months
```

**Chargeback Total**:
```sql
SELECT SUM(chargeback_amount)
FROM commissions
WHERE user_id = auth.uid() AND chargeback_amount > 0
```

---

### 9. Commission Earning Rate

**Formula**:
```
Earning Rate = Earned Amount / Total Advance Amount * 100
```

**SQL**:
```sql
SELECT
  SUM(earned_amount) * 100.0 / NULLIF(SUM(amount), 0) as earning_percentage
FROM commissions
WHERE user_id = auth.uid()
```

---

## Time-Based Metrics

### 10. Monthly/Weekly Trends

**Policies Per Month**:
```sql
SELECT
  DATE_TRUNC('month', effective_date) as month,
  COUNT(*) as policies,
  SUM(annual_premium) as total_premium
FROM policies
WHERE user_id = auth.uid()
GROUP BY month
ORDER BY month DESC
```

**Year-Over-Year Growth**:
```sql
SELECT
  EXTRACT(YEAR FROM effective_date) as year,
  COUNT(*) as policies,
  SUM(annual_premium) as total_premium
FROM policies
WHERE user_id = auth.uid()
GROUP BY year
ORDER BY year
```

---

## Implementation Notes

**All queries must**:
- Filter by `user_id = auth.uid()` (RLS)
- Handle NULL values (use NULLIF, COALESCE)
- Return zero for empty results, not NULL

**Performance**:
- Add indexes on: `user_id`, `status`, `effective_date`, `client_id`
- Use materialized views for expensive calculations
- Cache results in TanStack Query (5-minute stale time)

**Data Quality**:
- Policies never deleted, only status changed
- Maintain audit trail (created_at, updated_at)
- Validate dates (effective_date <= current_date for most cases)
