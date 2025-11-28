# Plan: Replace "Policy Survival Rates" Section in Analytics Dashboard

**Status:** Awaiting User Approval
**Created:** 2025-11-27
**Priority:** High
**Complexity:** Medium

---

## Problem Analysis

### Current State Issues

The "Policy Survival Rates" section in the Analytics Dashboard has the following critical problems:

1. **Confusing Terminology**
   - "Policy Survival Rates" - Sounds clinical/actuarial, not agent-friendly
   - "Cohort" - Academic jargon that most insurance agents won't understand
   - "M0, M3, M9" - Technical notation without clear meaning
   - "9-Month Retention" - Why 9 months? Context not obvious

2. **Wrong Mental Model**
   - Uses cohort retention analysis (valuable for SaaS companies, insurance carriers)
   - Individual agents don't think in terms of "cohorts" and "retention percentages"
   - Agents care about: money at risk, clients who need follow-up, sales quality

3. **No Financial Context**
   - Shows retention % but doesn't connect to dollar amounts
   - Agent seeing "85% retention" doesn't think "I'm at risk of losing $X in chargebacks"
   - Missing the critical financial impact

4. **Not Actionable**
   - No clear next steps
   - Shows historical data but doesn't guide action
   - Too much data (all cohorts going back years) instead of focusing on what matters NOW

5. **Technical Implementation is Sound but Presentation is Wrong**
   - The underlying calculations are mathematically correct
   - The cohort retention logic works properly
   - The problem is 100% in how it's presented to the user

### Database Schema Context

**Policies Table:**
- `status`: 'active', 'lapsed', 'cancelled'
- `effective_date`: Policy start date
- `cancellation_date`: When policy cancelled (if applicable)
- `cancellation_reason`: Why cancelled
- `monthly_premium`, `annual_premium`: Premium amounts

**Commissions Table:**
- `advance_months`: Typically 9 months (industry standard)
- `months_paid`: How many months client actually paid
- `earned_amount`: Commission earned so far
- `unearned_amount`: Commission still at risk of chargeback
- `chargeback_amount`: Actual chargebacks that occurred

**Critical Business Rule:**
- Most commission advances are 9 months
- If policy lapses before 9 months → FULL CHARGEBACK
- After 9 months → Commission is "earned" and safe
- Therefore: Policies in their first 9 months are in the "danger zone"

---

## Proposed Solutions

### Option A: Commission Protection Monitor (RECOMMENDED)

**Concept:** Focus on financial risk and actionable insights

**Key Metrics (4 Cards):**
1. **Policies in Danger Zone**
   - Count of active policies 0-9 months old
   - These are where commission can still be charged back

2. **At-Risk Commission**
   - Total dollar value of `unearned_amount` across all active policies
   - Shows exact financial exposure

3. **Protection Rate**
   - Simple: % of policies that survive past 9 months
   - Much simpler than cohort retention analysis

4. **Avg Policy Life**
   - Average number of months policies stay active
   - Indicates overall book quality

**Main Visualization: Policy Age Breakdown**
- Simple horizontal bar chart (NOT complex heatmap)
- Age buckets:
  - **0-3 months:** X policies ($Y at risk) - [Yellow - New]
  - **3-6 months:** X policies ($Y at risk) - [Orange - Watch]
  - **6-9 months:** X policies ($Y at risk) - [Red - Critical Zone]
  - **9-12 months:** X policies (Commission Secured) - [Light Green]
  - **12+ months:** X policies (Commission Secured) - [Dark Green]

**Actionable Insights Panel:**
- "✅ 7 policies approaching 9 months - great job keeping them active!"
- "⚠️ 3 policies haven't had a payment in 2 months - follow up needed"
- "📈 Your last 3 months of sales have 92% retention - improving!"
- "🎯 Focus on June 2025 policies - 2 are in the critical 6-9 month window"

**Plain Language Throughout:**
- "Danger Zone" instead of "cohort retention window"
- "Commission Secured" instead of "persistency achieved"
- "$X at risk" instead of abstract percentages
- "Follow up needed" instead of "churned in period T"

---

### Option B: Policy Book Health Dashboard

**Concept:** Broader view of entire book of business health

**Key Metrics:**
1. Active Policy Count & Total AP
2. Lapsed Rate (Last 30/60/90 days)
3. Cancellation Rate (Last 30/60/90 days)
4. Book Growth Trend (Are you growing or shrinking?)

**Main Visualization:**
- Stacked area chart showing active/lapsed/cancelled over time
- Trend line showing book health improving or declining

**Breakdown Tables:**
- By Carrier: Which carriers have best/worst retention?
- By Product: Which products stick best?
- By State: Geographic patterns in retention?

**Pros:**
- More comprehensive view
- Shows patterns across carriers/products
- Helps identify what's working

**Cons:**
- Less actionable than Option A
- Doesn't focus on immediate financial risk
- More data analysis, less action-oriented

---

### Option C: Simplified Cohort Retention (Keep Concept, Fix Language)

**Concept:** Keep cohort analysis but make it understandable

**Changes:**
- Title: "Sales Quality by Month" (not "Policy Survival Rates")
- Replace "Cohort" with "Sales Month"
- Show only last 12 months (not all history)
- Add financial impact: "Jan 2025: 18/20 active = $3,200 safe, $400 at risk"
- Simplify heatmap: Show only 3-month, 6-month, 9-month columns
- Add plain language: "Sales from Jan 2025: 90% still active after 9 months"

**Pros:**
- Preserves existing calculations
- Minimal code changes
- Still shows cohort-level insights

**Cons:**
- Still somewhat academic/analytical
- Doesn't address the fundamental "not actionable" problem
- User already said current approach "makes absolutely zero sense"

---

### Option D: Hybrid - Book Health & Protection

**Concept:** Combine Options A and B

**Top Section:** Commission Protection (from Option A)
- At-risk commission
- Policies in danger zone
- Age distribution chart
- Actionable insights

**Bottom Section:** Overall Book Trends (from Option B)
- Active/lapsed/cancelled over time
- Performance by carrier/product
- Growth trajectory

**Pros:**
- Most comprehensive
- Covers both tactical (what to do now) and strategic (long-term trends)

**Cons:**
- Might be too much information in one section
- Could overwhelm instead of clarify
- Violates "keep it simple" principle

---

## Recommendation: Option A (Commission Protection Monitor)

**Why Option A is Best:**

1. **Directly Addresses User Feedback**
   - User said section "makes absolutely zero sense"
   - Option A completely rethinks the approach
   - Focuses on what agents actually care about

2. **Immediately Actionable**
   - Shows what policies need attention
   - Quantifies financial risk
   - Provides specific next steps

3. **Plain Language**
   - No jargon ("cohort", "retention", "M0")
   - Financial terms agents understand ("at risk", "secured", "danger zone")
   - Action-oriented ("follow up needed")

4. **Right Level of Detail**
   - Not too simple (Option C might still confuse)
   - Not too complex (Option D might overwhelm)
   - Just enough to inform decisions

5. **Aligns with Business Model**
   - 9-month advance window is central to agent's reality
   - Financial risk is what keeps agents up at night
   - Helps protect their income

---

## Technical Implementation Plan

### New Files to Create

#### 1. `src/services/analytics/commissionProtectionService.ts`

**Functions:**

```typescript
// Get policy count and $ at risk for each age bucket
export function getPolicyAgeDistribution(
  policies: Policy[],
  commissions: Commission[]
): PolicyAgeDistribution[]

// Calculate total unearned commission across all active policies
export function getCommissionAtRisk(
  commissions: Commission[]
): number

// Calculate % of policies that survive past 9 months
export function getProtectionRate(
  policies: Policy[]
): number

// Get average policy lifespan in months
export function getAveragePolicyLife(
  policies: Policy[]
): number

// Identify policies needing attention (payment issues, approaching 9 months, etc.)
export function getPoliciesNeedingAttention(
  policies: Policy[],
  commissions: Commission[]
): PolicyAlert[]

// Generate actionable insights based on current data
export function getProtectionInsights(
  policies: Policy[],
  commissions: Commission[]
): string[]
```

**Data Flow:**
- Input: Policies and commissions from Supabase (via TanStack Query)
- Processing: Calculate age buckets, sum at-risk amounts, identify alerts
- Output: Structured data ready for UI components

#### 2. `src/features/analytics/components/CommissionProtectionMonitor.tsx`

**Component Structure:**

```typescript
export function CommissionProtectionMonitor() {
  const { dateRange } = useAnalyticsDateRange();
  const { protection, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="text-sm font-semibold uppercase">
          Commission Protection
        </div>
        <div className="text-xs text-muted-foreground">
          Monitor at-risk commission and policy health
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-4 gap-3 my-5">
          <MetricCard
            label="Policies in Danger Zone"
            value={protection.dangerZoneCount}
            description="0-9 months old"
          />
          <MetricCard
            label="At-Risk Commission"
            value={formatCurrency(protection.atRiskAmount)}
            description="Unearned advance"
          />
          <MetricCard
            label="Protection Rate"
            value={`${protection.protectionRate.toFixed(1)}%`}
            description="Policies surviving 9+ months"
          />
          <MetricCard
            label="Avg Policy Life"
            value={`${protection.avgPolicyLife.toFixed(1)} mo`}
            description="Average retention"
          />
        </div>

        {/* Age Distribution Chart */}
        <PolicyAgeChart data={protection.ageDistribution} />

        {/* Actionable Insights */}
        <InsightsPanel insights={protection.insights} />
      </CardContent>
    </Card>
  );
}
```

**Styling:**
- Follow existing card-based design pattern
- Use color coding: Red (critical), Orange (watch), Yellow (new), Green (secured)
- Maintain consistency with other analytics sections

#### 3. `src/features/analytics/visualizations/PolicyAgeChart.tsx`

**Visualization Type:** Horizontal bar chart (simple, clear)

**Structure:**
```typescript
export function PolicyAgeChart({ data }: { data: PolicyAgeDistribution[] }) {
  return (
    <div className="space-y-3">
      {data.map(bucket => (
        <div key={bucket.label} className="flex items-center gap-3">
          <div className="w-32 text-xs font-semibold">{bucket.label}</div>
          <div className="flex-1">
            <div
              className={`h-8 rounded flex items-center px-3 ${bucket.color}`}
              style={{ width: `${bucket.percentage}%` }}
            >
              <span className="text-xs font-semibold">
                {bucket.count} policies (${bucket.atRisk.toFixed(0)})
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**No external charting library needed** - Simple CSS bars are sufficient and performant

#### 4. `src/types/analytics.ts` (Update)

**New Types:**

```typescript
export interface PolicyAgeDistribution {
  label: string;           // "0-3 months", "3-6 months", etc.
  ageMin: number;          // Minimum age in months
  ageMax: number;          // Maximum age in months
  count: number;           // Number of policies in bucket
  atRisk: number;          // Dollar amount at risk (unearned commission)
  color: string;           // Tailwind class for color coding
  percentage: number;      // For bar chart width (0-100)
}

export interface ProtectionMetrics {
  dangerZoneCount: number;    // Policies 0-9 months old
  atRiskAmount: number;        // Total unearned commission
  protectionRate: number;      // % policies surviving 9+ months
  avgPolicyLife: number;       // Average age of all policies
  ageDistribution: PolicyAgeDistribution[];
  insights: string[];          // Actionable insights
  alerts: PolicyAlert[];       // Policies needing attention
}

export interface PolicyAlert {
  policyId: string;
  clientName: string;
  alertType: 'payment_issue' | 'approaching_milestone' | 'high_risk';
  message: string;
  severity: 'low' | 'medium' | 'high';
  daysInStatus: number;
}
```

### Files to Modify

#### 1. `src/features/analytics/AnalyticsDashboard.tsx`

**Change:**
```typescript
// OLD:
import { CohortAnalysis } from './components/CohortAnalysis';

// In render:
<CohortAnalysis />

// NEW:
import { CommissionProtectionMonitor } from './components/CommissionProtectionMonitor';

// In render:
<CommissionProtectionMonitor />
```

**Keep old import commented out for easy rollback:**
```typescript
// import { CohortAnalysis } from './components/CohortAnalysis'; // OLD - can restore if needed
```

#### 2. `src/hooks/analytics/useAnalyticsData.ts`

**Add to return value:**
```typescript
export function useAnalyticsData(options?: UseAnalyticsDataOptions) {
  // ... existing code ...

  // NEW: Protection metrics
  const protectionData = {
    dangerZoneCount: getPoliciesInDangerZone(policies).length,
    atRiskAmount: getCommissionAtRisk(commissions),
    protectionRate: getProtectionRate(policies),
    avgPolicyLife: getAveragePolicyLife(policies),
    ageDistribution: getPolicyAgeDistribution(policies, commissions),
    insights: getProtectionInsights(policies, commissions),
    alerts: getPoliciesNeedingAttention(policies, commissions),
  };

  return {
    isLoading,
    cohort: cohortData,           // KEEP - might use later
    segmentation: segmentationData,
    forecast: forecastData,
    attribution: attributionData,
    protection: protectionData,    // NEW
    raw: { policies, commissions, expenses, carriers },
  };
}
```

### Files to Keep (For Potential Rollback)

**Do NOT delete these files:**
- `src/features/analytics/components/CohortAnalysis.tsx`
- `src/features/analytics/visualizations/CohortHeatmap.tsx`
- `src/services/analytics/cohortService.ts`

**Reason:** If user doesn't like the new approach, we can quickly revert

---

## Implementation Steps

### Phase 1: Create New Service Layer
1. Create `commissionProtectionService.ts`
2. Implement all 6 functions with proper TypeScript types
3. Write unit tests for each function
4. Test with real database data

**Acceptance Criteria:**
- ✅ All functions return expected data structures
- ✅ Handles edge cases (no policies, all policies > 9 months, etc.)
- ✅ Tests pass with 100% coverage
- ✅ Performance is acceptable (< 100ms for typical dataset)

### Phase 2: Create New UI Components
1. Create `CommissionProtectionMonitor.tsx` component
2. Create `PolicyAgeChart.tsx` visualization
3. Create `InsightsPanel.tsx` for actionable insights
4. Style to match existing analytics sections

**Acceptance Criteria:**
- ✅ Components render without errors
- ✅ Styling matches rest of analytics dashboard
- ✅ Responsive design works on different screen sizes
- ✅ Loading states handled gracefully

### Phase 3: Update Analytics Hook
1. Add protection metrics to `useAnalyticsData`
2. Import new service functions
3. Test data flow from Supabase → hook → component

**Acceptance Criteria:**
- ✅ Hook returns protection data correctly
- ✅ TanStack Query caching works
- ✅ Date range filtering applies to protection metrics
- ✅ No performance regression

### Phase 4: Swap Components in Dashboard
1. Update `AnalyticsDashboard.tsx` to use new component
2. Test in local dev environment
3. Verify all data displays correctly
4. Check for console errors or warnings

**Acceptance Criteria:**
- ✅ New section renders in analytics dashboard
- ✅ No TypeScript errors
- ✅ No runtime errors
- ✅ Data updates when date range changes

### Phase 5: User Testing & Feedback
1. Deploy to production (or staging if available)
2. Get user feedback on clarity and usefulness
3. Ask specific questions:
   - "Does this make sense at a glance?"
   - "Can you tell what action to take?"
   - "Is this more useful than the old section?"
4. Iterate based on feedback

**Acceptance Criteria:**
- ✅ User understands the section without explanation
- ✅ User can identify actionable next steps
- ✅ User prefers this to old "Policy Survival Rates" section

### Phase 6: Polish & Optimize
1. Add tooltips for metric cards
2. Improve insights algorithm based on real data patterns
3. Optimize performance if needed
4. Add documentation

**Acceptance Criteria:**
- ✅ Insights are relevant and helpful
- ✅ Performance is optimal
- ✅ Code is documented
- ✅ User is satisfied

---

## Testing Strategy

### Unit Tests

**Service Functions:**
```typescript
describe('commissionProtectionService', () => {
  describe('getPolicyAgeDistribution', () => {
    it('should correctly bucket policies by age');
    it('should sum at-risk commission per bucket');
    it('should handle empty policy array');
    it('should handle policies with no commission records');
  });

  describe('getProtectionRate', () => {
    it('should calculate % of policies surviving 9+ months');
    it('should handle all policies < 9 months');
    it('should handle all policies > 9 months');
    it('should return 0 for empty array');
  });

  // ... tests for other functions
});
```

### Integration Tests

**Component Tests:**
```typescript
describe('CommissionProtectionMonitor', () => {
  it('should render all metric cards');
  it('should display age distribution chart');
  it('should show actionable insights');
  it('should handle loading state');
  it('should handle error state');
});
```

### Manual Testing Scenarios

1. **Empty State**
   - No policies → Should show zeros gracefully
   - Message: "No policies yet - start tracking to see protection metrics"

2. **All Safe**
   - All policies > 9 months → Should show "All commissions secured!"
   - At-risk amount should be $0

3. **Mixed Ages**
   - Policies across all age buckets
   - Verify correct bucketing and $ calculations

4. **High Risk**
   - Many policies in 6-9 month window
   - Should trigger warning insights

5. **Payment Issues**
   - Policies with low months_paid relative to age
   - Should appear in "needs attention" alerts

---

## Rollback Plan

If user doesn't like the new approach:

**Step 1:** Revert Dashboard Change
```typescript
// In AnalyticsDashboard.tsx
import { CohortAnalysis } from './components/CohortAnalysis';
// Comment out: import { CommissionProtectionMonitor } ...

// In render:
<CohortAnalysis />
```

**Step 2:** Keep New Code
- Don't delete new files
- They can coexist with old code
- Might be useful for other features

**Step 3:** Gather Specific Feedback
- Ask what didn't work
- Iterate on approach
- Try hybrid solution if needed

---

## Success Metrics

### Immediate (Week 1)
- ✅ User understands the section without explanation
- ✅ No console errors or runtime issues
- ✅ Data displays correctly across different date ranges

### Short-term (Month 1)
- ✅ User reports taking action on insights (following up with clients, etc.)
- ✅ User checks this section regularly (vs. ignoring old cohort section)
- ✅ User can answer: "How much commission am I at risk of losing?"

### Long-term (Quarter 1)
- ✅ User's actual chargeback rate decreases (better client management)
- ✅ Protection rate improves (selling policies that stick)
- ✅ User considers this a valuable tool (vs. just noise)

---

## Questions for User Before Implementation

1. **Which option do you prefer?**
   - Option A: Commission Protection Monitor (recommended)
   - Option B: Policy Book Health Dashboard
   - Option C: Simplified Cohort Retention
   - Option D: Hybrid approach
   - Other ideas?

2. **Are there specific metrics you want to see?**
   - What questions are you trying to answer?
   - What decisions would this section help you make?

3. **How much detail do you want?**
   - Simple overview with key metrics only?
   - Detailed breakdown with insights?
   - Ability to drill down into specific policies?

4. **Should we keep the old section available?**
   - As a toggle/tab?
   - Completely remove it?
   - Move to a separate "Advanced Analytics" page?

---

## Notes

- All new code will follow existing patterns (TanStack Query, React 19.1, shadcn components)
- No local storage - all data from Supabase
- Performance optimized with React 19.1 automatic optimizations
- Type-safe with strict TypeScript
- Tested thoroughly before deployment
- Easy rollback if needed

---

**Next Steps:**
1. Get user approval on which option to implement
2. Start Phase 1 (Service Layer) implementation
3. Iterate based on feedback
