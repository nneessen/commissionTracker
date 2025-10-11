# Analytics Formula Verification Plan
**Date**: Oct 11, 2025
**Status**: IN PROGRESS
**Goal**: Comprehensive review and validation of all analytics calculations against business rules

---

## Overview

This plan outlines a systematic approach to verify that all analytics formulas in the application match the official business rules defined in:
- `docs/kpi-definitions.md`
- `docs/commission-lifecycle-business-rules.md`

---

## Phase 1: Documentation Review & Test Data Preparation

### 1.1 Document Current Formulas ⏳
- [ ] Create mapping document: `docs/analytics-formula-audit.md`
- [ ] Extract all formulas from each analytics service file
- [ ] Cross-reference with official business rule docs
- [ ] Identify any discrepancies between docs and implementation

### 1.2 Prepare Test Dataset
- [ ] Create realistic test data fixture with known expected outputs
- [ ] Include edge cases:
  - Zero policies/commissions
  - Single policy scenarios
  - Policies with different persistency rates (3mo, 6mo, 9mo, 12mo)
  - Various commission rates and advance scenarios
  - Multiple carriers, products, states
  - Date range boundary conditions

---

## Phase 2: Service-by-Service Formula Verification

### 2.1 Cohort Service (`cohortService.ts`)
**Functions to verify:**
- `getCohortRetention()` - Retention rate calculations
- `getChargebacksByCohort()` - Chargeback aggregation by cohort
- `getEarningProgressByCohort()` - Earning progress tracking
- `getCohortSummary()` - Summary metrics

**Verification checklist:**
- [ ] Persistency rate formula: `(active at milestone / total started) * 100`
- [ ] Months since start calculation accuracy
- [ ] Cohort grouping logic (by month)
- [ ] Handle empty cohorts gracefully
- [ ] Chargeback calculations match business rules

### 2.2 Attribution Service (`attributionService.ts`)
**Functions to verify:**
- `calculateContribution()` - Premium/commission contribution breakdown
- `calculateCarrierROI()` - ROI by carrier
- `getProductMixEvolution()` - Product mix changes over time
- `getTopMovers()` - Top performing entities

**Verification checklist:**
- [ ] Contribution formula: percentage of total
- [ ] ROI calculation: `(commission earned - costs) / costs`
- [ ] Product mix percentages sum to 100%
- [ ] Month-over-month comparison logic
- [ ] Top movers ranking algorithm

### 2.3 Forecast Service (`forecastService.ts`)
**Functions to verify:**
- `projectGrowth()` - Growth projections
- `forecastRenewals()` - Renewal predictions
- `calculateChargebackRisk()` - Risk scoring
- `detectSeasonality()` - Seasonal pattern detection
- `getForecastSummary()` - Aggregated forecast

**Verification checklist:**
- [ ] Growth projection formula matches docs
- [ ] Linear regression calculations
- [ ] Renewal forecast based on persistency
- [ ] Chargeback risk formula: unearned / total advance
- [ ] Seasonality detection algorithm validity
- [ ] Handle insufficient data gracefully

### 2.4 Segmentation Service (`segmentationService.ts`)
**Functions to verify:**
- `segmentClientsByValue()` - Client value tier assignment
- `getClientLifetimeValue()` - LTV calculation
- `calculateCrossSellOpportunities()` - Cross-sell scoring
- `getRecommendedProducts()` - Product recommendations

**Verification checklist:**
- [ ] Client value tiers (high/medium/low) thresholds
- [ ] LTV formula: `total premium * persistency * years`
- [ ] Cross-sell score calculation
- [ ] Segmentation logic matches business intent
- [ ] Handle clients with no policies

### 2.5 Breakeven Service (`breakevenService.ts`)
**Functions to verify:**
- `calculateBreakeven()` - Breakeven analysis
- `analyzeScenarios()` - Scenario modeling
- `calculateProfitTargets()` - Profit target calculations

**Verification checklist:**
- [ ] Breakeven formula: `fixed costs / (price - variable cost)`
- [ ] Scenario modeling assumptions
- [ ] Profit target calculations
- [ ] Cost allocation logic

---

## Phase 3: Component-Level Calculation Verification

### 3.1 Cohort Analysis Component
**File**: `src/features/analytics/components/CohortAnalysis.tsx`
- [ ] Verify data transformations before visualization
- [ ] Check aggregation logic in component
- [ ] Ensure proper handling of missing data

### 3.2 Client Segmentation Component
**File**: `src/features/analytics/components/ClientSegmentation.tsx`
- [ ] Verify segment transformation from object to array
- [ ] Check percentage calculations
- [ ] Validate tier classification display

### 3.3 Commission Deep Dive Component
**File**: `src/features/analytics/components/CommissionDeepDive.tsx`
- [ ] Verify earned vs unearned calculations
- [ ] Check advance calculations match business rules
- [ ] Validate chargeback risk scoring

### 3.4 Performance Attribution Component
**File**: `src/features/analytics/components/PerformanceAttribution.tsx`
- [ ] Verify contribution decomposition
- [ ] Check waterfall chart data preparation
- [ ] Validate variance calculations

### 3.5 Predictive Analytics Component
**File**: `src/features/analytics/components/PredictiveAnalytics.tsx`
- [ ] Verify forecast calculations
- [ ] Check growth projection formulas
- [ ] Validate confidence intervals

### 3.6 Product Matrix Component
**File**: `src/features/analytics/components/ProductMatrix.tsx`
- [ ] Verify product performance metrics
- [ ] Check cross-tabulation logic
- [ ] Validate aggregation formulas

---

## Phase 4: Visualization Data Integrity

### 4.1 Chart Data Transformations
**Files to review:**
- `WaterfallChart.tsx` - Waterfall chart calculations
- `ForecastChart.tsx` - Forecast line chart
- `ScatterPlot.tsx` - Scatter plot positioning
- `CohortHeatmap.tsx` - Heatmap color scaling
- `USMap.tsx` - Geographic aggregation

**Verification checklist:**
- [ ] Data transformations preserve accuracy
- [ ] No precision loss in calculations
- [ ] Scale calculations correct (min/max)
- [ ] Percentage calculations sum correctly
- [ ] Handle edge cases (empty data, single point)

---

## Phase 5: Integration Testing

### 5.1 End-to-End Flow Testing
- [ ] Test with real database connection
- [ ] Verify date range filtering works correctly
- [ ] Test MTD, YTD, Last 30/60/90 day filters
- [ ] Verify custom date range filtering
- [ ] Check that all components receive correct filtered data

### 5.2 Cross-Component Consistency
- [ ] Verify same metric shows same value across different components
- [ ] Check total commission consistency across views
- [ ] Validate policy count consistency
- [ ] Ensure persistency rates match across displays

### 5.3 Performance Validation
- [ ] Verify calculations complete in reasonable time
- [ ] Check memoization prevents unnecessary recalculations
- [ ] Validate no infinite loops in calculations
- [ ] Monitor for memory leaks with large datasets

---

## Phase 6: Business Rule Compliance

### 6.1 Commission Calculations
**Reference**: `docs/commission-lifecycle-business-rules.md`
- [ ] Advance formula: `Monthly Premium × Advance Months × Commission Rate`
- [ ] Earned formula: `(Advance / Advance Months) × Months Paid`
- [ ] Unearned formula: `Advance - Earned`
- [ ] Chargeback formula: `Unearned (when policy lapses)`

### 6.2 KPI Calculations
**Reference**: `docs/kpi-definitions.md`
- [ ] Avg AP: `AVG(annual_premium WHERE status='active')`
- [ ] Persistency: `(active at milestone / total) * 100`
- [ ] Pace: `(target - YTD) / weeks remaining / avg AP`
- [ ] State performance aggregations
- [ ] Carrier performance metrics

### 6.3 Edge Cases & Boundaries
- [ ] Zero division protection (use NULLIF, minimum values)
- [ ] NULL value handling (COALESCE, default values)
- [ ] Empty array handling (return zero, not undefined)
- [ ] Single data point scenarios
- [ ] Future date handling
- [ ] Negative value prevention

---

## Phase 7: Documentation & Test Suite

### 7.1 Create Test Suite
**Location**: `src/services/analytics/__tests__/`
- [ ] Create unit tests for each service function
- [ ] Add integration tests for `useAnalyticsData` hook
- [ ] Create snapshot tests for component calculations
- [ ] Add regression tests for known edge cases

### 7.2 Update Documentation
- [ ] Document all formula discrepancies found
- [ ] Update `docs/kpi-definitions.md` if needed
- [ ] Add inline JSDoc comments to complex formulas
- [ ] Create formula verification report

### 7.3 Create Validation Plan Document
- [ ] Document all findings in this file
- [ ] List all formulas verified
- [ ] Mark pass/fail for each verification
- [ ] Provide remediation steps for failures

---

## Progress Tracking

### Completed Tasks
- ✅ Plan created and approved

### In Progress
- ⏳ Phase 1.1: Creating formula audit document

### Blocked / Issues
- None currently

---

## Success Criteria

✅ **All formulas verified against business rules**
✅ **Test suite provides >90% coverage for analytics services**
✅ **No calculation discrepancies between components**
✅ **All edge cases handled gracefully (no crashes, NaN, undefined)**
✅ **Documentation updated and accurate**
✅ **Performance acceptable (<2s for all calculations)**

---

## Estimated Effort
- **Phase 1**: 2 hours
- **Phase 2**: 4 hours
- **Phase 3**: 3 hours
- **Phase 4**: 2 hours
- **Phase 5**: 2 hours
- **Phase 6**: 2 hours
- **Phase 7**: 3 hours
**Total**: ~18 hours

---

## Deliverables
1. Formula verification report (`docs/analytics-formula-audit.md`)
2. Comprehensive test suite
3. Updated documentation
4. This tracking document with all findings
5. List of any bugs/fixes needed

---

**Last Updated**: Oct 11, 2025
**Next Review**: After each phase completion
