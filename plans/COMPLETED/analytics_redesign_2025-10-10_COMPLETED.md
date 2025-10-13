# Analytics Page Redesign Plan

**Created:** 2025-10-10
**Status:** ACTIVE
**Priority:** High
**Estimated Time:** 7-10 days

---

## 🎯 Objectives

**Transform the Analytics page from a dashboard clone into a deep-analysis powerhouse** that complements (not duplicates) the main dashboard.

**Key Goals:**
- **NO duplication** of dashboard KPIs (commission earned, active policies, etc.)
- **Data-dense + visual** style aligned with dashboard aesthetic
- **Advanced insights** - trends, patterns, attribution, predictions
- **KISS/SOLID principles** - clean architecture, reusable components

---

## 📊 New Analytics Page Structure

### **Layout: 2-Column Responsive Grid** (NOT 3-column like dashboard)

**Header Section:**
- Title: "Performance Analytics"
- Subtitle: "Deep-dive analysis and insights"
- Time period selector (MTD, YTD, Last 30/60/90, Custom)
- Comparison mode toggle (YoY, MoM, vs Previous Period)
- Export button (CSV/PDF)

### **Section 1: Performance Attribution Dashboard**
*What's driving your results?*

**Components:**
- **Contribution Waterfall Chart** - Break down commission growth by factor (volume, rate, mix)
- **Product Mix Evolution** - Stacked area chart showing product composition over time
- **Carrier ROI Scatter Plot** - Premium vs Commission Rate (bubble size = policy count)
- **Top Movers Table** - Biggest positive/negative contributors this period

**Data Sources:** `commissions`, `policies`, `products`, `carriers`

---

### **Section 2: Cohort Analysis**
*How do different groups of policies perform?*

**Components:**
- **Policy Retention Cohort Table** - Heatmap showing retention by start month
- **Chargeback Risk by Cohort** - Which cohorts have highest chargeback rates
- **Premium Persistence Curves** - Line chart showing premium drop-off over time
- **Advance Earning Progress** - Stacked bar showing earned vs unearned by cohort

**Data Sources:** `commissions` (months_paid, earned_amount, unearned_amount, chargeback_amount)

**New Calculation Required:** Group policies by `effective_date` month → track status changes

---

### **Section 3: Client Segmentation Matrix**
*Who are your most valuable clients?*

**Components:**
- **Value Segmentation Scatter** - Age vs Total Premium (color by state, size by policy count)
- **Cross-Sell Opportunity Matrix** - Clients with 1 policy vs 2+ policies
- **State Performance Heatmap** - US map visualization with color intensity = revenue
- **Client Lifetime Value Distribution** - Histogram showing client value clusters

**Data Sources:** `clients` joined with `policies`

**New Calculation Required:** Client segmentation logic (High/Medium/Low value tiers)

---

### **Section 4: Commission Deep-Dive**
*Understanding your commission lifecycle*

**Components:**
- **Advance vs Earned Tracking** - Dual-axis line chart over time
- **Unearned Exposure Calendar** - Monthly view of chargeback risk
- **Commission Velocity Analysis** - Average days from policy → payment
- **Payment Timeline Gantt** - Visual pipeline of expected vs actual payments

**Data Sources:** `commissions` (advance_amount, earned_amount, unearned_amount, payment_date, created_at)

**New Calculation Required:** Time-to-payment metrics, exposure calculations

---

### **Section 5: Product Performance Matrix**
*Sortable, filterable product comparison*

**Components:**
- **Performance Table** - Multi-column sortable grid:
  - Product | Policies | Premium | Avg Size | Commission | Retention | Chargeback Rate | Growth Rate
- **Product Conversion Funnel** - Pending → Active → Retained (by product)
- **Product Mix Trends** - Line chart showing % composition over time
- **Profitability Ranking** - Bar chart of commission per effort/policy

**Data Sources:** `policies`, `products`, `commissions`

---

### **Section 6: Geographic Analysis**
*Where should you focus your efforts?*

**Components:**
- **Interactive State Map** - Choropleth map colored by revenue/policies
- **State Performance Table** - Sortable by policies, premium, avg size, growth
- **State Trend Sparklines** - Inline mini-charts showing 12-month trends
- **Market Penetration Score** - States with high potential, low penetration

**Data Sources:** `clients.address` (state), `policies`

**New Feature:** SVG US map component with hover states

---

### **Section 7: Predictive Analytics**
*What's coming next?*

**Components:**
- **12-Month Renewal Forecast Calendar** - Grid showing expected renewals by month
- **Chargeback Risk Score** - ML-style risk indicators by policy age
- **Growth Trajectory Projection** - Line chart with confidence intervals
- **Seasonality Heat Map** - Which months historically perform best

**Data Sources:** `policies` (term_length, effective_date), `commissions` (chargeback patterns)

**New Calculation Required:** Statistical forecasting, seasonality detection

---

### **Section 8: Efficiency & ROI Metrics**
*How efficient is your operation?*

**Components:**
- **Cost Per Policy** - Expenses / Policies over time
- **Marketing ROI by Source** - If `referral_source` is populated
- **Productivity Trends** - Policies per day/week, commission per hour worked
- **Break-Even Analysis Timeline** - Historical view of monthly breakeven

**Data Sources:** `expenses`, `policies`, `commissions`

---

## 🎨 Design System

### **Color Palette** (aligned with dashboard)
```
Primary Dark: #1a1a1a, #2d3748 (for headers, accents)
Background: #ffffff, #f8f9fa, #e2e8f0 (light grays)
Chart Colors: #3b82f6 (blue), #10b981 (green), #f59e0b (amber), #ef4444 (red), #8b5cf6 (purple)
Text: #1a1a1a (primary), #656d76 (secondary), #94a3b8 (muted)
```

### **Typography**
```
Headers: 13-16px, font-weight: 600, uppercase, letter-spacing: 0.5px
Body: 11-12px, font-weight: 400-500
Numbers: Monaco/monospace, 11-12px, font-weight: 600
```

### **Component Patterns**

**Section Container:**
```tsx
<div style={{
  background: '#ffffff',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  marginBottom: '16px'
}}>
```

**Section Header:**
```tsx
<div style={{
  fontSize: '13px',
  fontWeight: 600,
  color: '#1a1a1a',
  marginBottom: '16px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'flex',
  justifyContent: 'space-between'
}}>
```

---

## 🏗️ Architecture

### **File Structure**
```
src/features/analytics/
├── AnalyticsPage.tsx              # Main page component
├── components/
│   ├── PerformanceAttribution.tsx
│   ├── CohortAnalysis.tsx
│   ├── ClientSegmentation.tsx
│   ├── CommissionDeepDive.tsx
│   ├── ProductMatrix.tsx
│   ├── GeographicAnalysis.tsx
│   ├── PredictiveAnalytics.tsx
│   └── EfficiencyMetrics.tsx
├── visualizations/
│   ├── WaterfallChart.tsx
│   ├── CohortHeatmap.tsx
│   ├── ScatterPlot.tsx
│   ├── USMap.tsx
│   └── ForecastChart.tsx
└── hooks/
    ├── useAnalyticsData.ts        # Main data aggregation hook
    ├── useCohortAnalysis.ts
    ├── useClientSegmentation.ts
    └── usePredictiveMetrics.ts

src/services/analytics/
├── cohortService.ts               # Cohort calculations
├── segmentationService.ts         # Client segmentation
├── forecastService.ts             # Predictive analytics
└── attributionService.ts          # Performance attribution

src/utils/
├── chartHelpers.ts                # Chart formatting utilities
└── statisticalAnalysis.ts         # Statistical functions
```

### **New Services to Create**

**1. `cohortService.ts`** - Policy cohort analysis
- `getCohortRetention(policies, commissions): CohortData`
- `getChargebacksByCohort(commissions): CohortChargebacks`
- `getEarningProgressByCohort(commissions): EarningProgress`

**2. `segmentationService.ts`** - Client segmentation
- `segmentClientsByValue(clients, policies): ClientSegments`
- `calculateCrossSellOpportunities(clients, policies): CrossSellData`
- `getClientLifetimeValue(clientId, policies): number`

**3. `forecastService.ts`** - Predictions
- `forecastRenewals(policies): RenewalForecast[]`
- `calculateChargebackRisk(policy, commissions): RiskScore`
- `projectGrowth(historicalData): GrowthProjection`
- `detectSeasonality(monthlyData): SeasonalityPattern`

**4. `attributionService.ts`** - Performance drivers
- `calculateContribution(current, previous): ContributionBreakdown`
- `getProductMixEvolution(policies): MixTrends`
- `calculateCarrierROI(carriers, policies, commissions): ROIMetrics`

---

## 📝 Implementation Steps

### **Phase 1: Foundation** (1-2 days)
1. ✅ Pull current schema (DONE)
2. ✅ Review existing code (DONE)
3. Create new service files (cohort, segmentation, forecast, attribution)
4. Write service unit tests
5. Create base analytics data hook (`useAnalyticsData`)

### **Phase 2: Core Components** (2-3 days) - NEXT UP
6. Create `src/hooks/useAnalyticsData.ts` - centralized data aggregation hook
7. Build visualization components:
   - WaterfallChart.tsx (contribution breakdown)
   - CohortHeatmap.tsx (retention heatmap)
   - ScatterPlot.tsx (age/premium, ROI plots)
   - USMap.tsx (geographic visualization)
   - ForecastChart.tsx (projections with confidence)
8. Create 8 section components (one for each analytics section)
9. Implement responsive 2-column grid layout
10. Add time period filtering integration

**Files to create:**
- `src/hooks/useAnalyticsData.ts`
- `src/features/analytics/visualizations/` (5 files)
- `src/features/analytics/components/` (8 files)

### **Phase 3: Advanced Features** (2-3 days)
10. Build US Map component for geographic analysis
11. Implement cohort retention heatmap
12. Create forecast visualizations
13. Add comparison modes (YoY, MoM)

### **Phase 4: Polish & Integration** (1-2 days)
14. Style alignment with dashboard aesthetic
15. Loading states and error handling
16. Export functionality (CSV/PDF)
17. Performance optimization (memoization, lazy loading)

### **Phase 5: Testing & Documentation** (1 day)
18. Component testing
19. Integration testing with real data
20. Update documentation
21. Move plan to `plans/completed/`

---

## ⚠️ Critical Rules to Follow

1. **NO localStorage** - All data from Supabase
2. **NO code duplication** - Delete old `AnalyticsDashboard.tsx` components after migration
3. **NO unconventional naming** - Use clear, standard component names
4. **Test before changes** - Run existing tests first
5. **Review code twice** - Especially service calculations
6. **KISS principles** - Simple, focused functions
7. **Use existing hooks** - Leverage `useMetrics`, `useMetricsWithDateRange`
8. **Check file placement** - Services in services/, components in features/
9. **Update migrations** if new DB functions needed

---

## 🎯 Success Criteria

- ✅ Zero duplication of dashboard KPIs
- ✅ All 8 sections implemented and functional
- ✅ Visual design aligns with dashboard (but distinct)
- ✅ Page loads in <2 seconds
- ✅ All calculations verified with sample data
- ✅ Mobile responsive (stacks to 1-column on small screens)
- ✅ Exports work correctly
- ✅ No TypeScript errors
- ✅ All tests passing

---

## 📦 Deliverables

1. **New Analytics Page** - `src/features/analytics/AnalyticsPage.tsx`
2. **8 Section Components** - All visualization sections
3. **4 New Services** - Cohort, segmentation, forecast, attribution
4. **5 Visualization Components** - Waterfall, heatmap, scatter, map, forecast charts
5. **3 New Hooks** - Analytics data aggregation
6. **Tests** - Unit tests for all services
7. **Documentation** - Updated architecture docs
8. **Plan Archive** - This plan moved to `plans/completed/analytics_redesign_2025-10-10.md`

---

## 📊 Database Schema Reference

### **Tables Used:**

**policies:**
- `id`, `user_id`, `client_id`, `carrier_id`, `product_id`, `product`
- `policy_number`, `status`, `effective_date`, `expiration_date`, `term_length`
- `annual_premium`, `monthly_premium`, `payment_frequency`
- `commission_percentage`, `referral_source`
- `created_at`, `updated_at`

**commissions:**
- `id`, `user_id`, `policy_id`
- `amount` (advance_amount), `rate`, `type`, `status`
- `advance_months`, `months_paid`
- `earned_amount`, `unearned_amount`
- `payment_date`, `last_payment_date`
- `chargeback_amount`, `chargeback_date`, `chargeback_reason`
- `created_at`, `updated_at`

**clients:**
- `id`, `user_id`, `name`, `email`, `phone`, `address`
- `created_at`, `updated_at`

**carriers:**
- `id`, `name`, `code`, `contact_info`, `commission_structure`
- `is_active`, `created_at`, `updated_at`

**products:**
- `id`, `carrier_id`, `name`, `code`, `product_type`
- `commission_percentage`, `min_premium`, `max_premium`
- `min_age`, `max_age`, `is_active`
- `created_at`, `updated_at`

**expenses:**
- `id`, `user_id`, `name`, `description`, `amount`
- `category`, `date`, `expense_type`
- `is_recurring`, `is_deductible`
- `created_at`, `updated_at`

---

## 🔄 Progress Tracking

**Phase 1:** ✅ **COMPLETE** (Foundation Services)
- ✅ cohortService.ts - Retention & chargeback analysis
- ✅ segmentationService.ts - Client value tiers & cross-sell
- ✅ forecastService.ts - Renewals, risk scores, growth projections
- ✅ attributionService.ts - Performance drivers & top movers
- ✅ Unit tests - 86 tests, all passing ✅

**Phase 2:** ⬜ Not Started (Core Components)
**Phase 3:** ⬜ Not Started (Advanced Features)
**Phase 4:** ⬜ Not Started (Polish & Integration)
**Phase 5:** ⬜ Not Started (Testing & Documentation)

**Overall Progress:** 20% (Phase 1 Complete - Services Tested & Verified)

---

**Last Updated:** 2025-10-10 20:51
**Next Review:** After Phase 2 completion
