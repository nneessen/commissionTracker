# Analytics Formula Audit
**Date**: Oct 11, 2025
**Purpose**: Map all analytics formulas to business rules and verify correctness

---

## Table of Contents
1. [Cohort Service Formulas](#cohort-service-formulas)
2. [Attribution Service Formulas](#attribution-service-formulas)
3. [Forecast Service Formulas](#forecast-service-formulas)
4. [Segmentation Service Formulas](#segmentation-service-formulas)
5. [Breakeven Service Formulas](#breakeven-service-formulas)
6. [Verification Results](#verification-results)
7. [Discrepancies Found](#discrepancies-found)

---

## Cohort Service Formulas

**File**: `src/services/analytics/cohortService.ts`

### Function: `getCohortRetention()`
**Purpose**: Calculate retention rates by cohort

**Formula (Expected)**:
```
Retention Rate = (Policies Active at Milestone / Total Policies Started) × 100
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `getChargebacksByCohort()`
**Purpose**: Aggregate chargebacks by policy cohort

**Formula (Expected)**:
```
Chargeback Amount = Advance - Earned
Earned = (Advance / Advance Months) × Months Paid
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `getEarningProgressByCohort()`
**Purpose**: Track earning progress for commission advances

**Formula (Expected)**:
```
Earned Amount = (Advance / Advance Months) × Months Paid
Unearned Amount = Advance - Earned
Percentage Earned = (Months Paid / Advance Months) × 100
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `getCohortSummary()`
**Purpose**: Aggregate cohort summary metrics

**Formula (Expected)**:
```
Total Premium = SUM(annual_premium)
Avg Premium = AVG(annual_premium)
Policy Count = COUNT(*)
Active Count = COUNT(WHERE status = 'active')
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

## Attribution Service Formulas

**File**: `src/services/analytics/attributionService.ts`

### Function: `calculateContribution()`
**Purpose**: Calculate contribution breakdown by dimension

**Formula (Expected)**:
```
Contribution % = (Dimension Value / Total Value) × 100
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `calculateCarrierROI()`
**Purpose**: Calculate return on investment by carrier

**Formula (Expected)**:
```
ROI = (Commission Earned - Costs) / Costs × 100
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `getProductMixEvolution()`
**Purpose**: Track product mix changes over time

**Formula (Expected)**:
```
Product Mix % = (Product Premium / Total Premium) × 100
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `getTopMovers()`
**Purpose**: Identify top performing entities

**Formula (Expected)**:
```
Change = Current Period - Previous Period
Change % = (Change / Previous Period) × 100
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

## Forecast Service Formulas

**File**: `src/services/analytics/forecastService.ts`

### Function: `projectGrowth()`
**Purpose**: Project future growth trends

**Formula (Expected)**:
```
Linear Regression: y = mx + b
Where:
- m = slope (growth rate)
- b = intercept
- x = time period
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `forecastRenewals()`
**Purpose**: Forecast policy renewals

**Formula (Expected)**:
```
Expected Renewals = Policies Due × Persistency Rate
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `calculateChargebackRisk()`
**Purpose**: Calculate chargeback risk score

**Formula (Expected)**:
```
Chargeback Risk = Unearned Amount / Total Advance × 100
Risk Level:
- HIGH: months_paid < 3
- MEDIUM: 3 ≤ months_paid < 6
- LOW: 6 ≤ months_paid < 9
- NONE: months_paid ≥ 9
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `detectSeasonality()`
**Purpose**: Detect seasonal patterns in data

**Formula (Expected)**:
```
[Statistical algorithm - to be documented]
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `getForecastSummary()`
**Purpose**: Aggregate forecast metrics

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

## Segmentation Service Formulas

**File**: `src/services/analytics/segmentationService.ts`

### Function: `segmentClientsByValue()`
**Purpose**: Segment clients into value tiers

**Formula (Expected)**:
```
Client Value = Total Annual Premium
Tiers:
- HIGH: Top 20% by value
- MEDIUM: Middle 50%
- LOW: Bottom 30%
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `getClientLifetimeValue()`
**Purpose**: Calculate client lifetime value

**Formula (Expected)**:
```
LTV = Total Premium × Expected Persistency × Years
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `calculateCrossSellOpportunities()`
**Purpose**: Identify cross-sell opportunities

**Formula (Expected)**:
```
Cross-sell Score = [Algorithm to be documented]
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `getRecommendedProducts()`
**Purpose**: Recommend products for clients

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

## Breakeven Service Formulas

**File**: `src/services/analytics/breakevenService.ts`

### Function: `calculateBreakeven()`
**Purpose**: Calculate breakeven point

**Formula (Expected)**:
```
Breakeven Units = Fixed Costs / (Price - Variable Cost)
Breakeven Revenue = Breakeven Units × Price
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `analyzeScenarios()`
**Purpose**: Model different business scenarios

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

### Function: `calculateProfitTargets()`
**Purpose**: Calculate profit targets

**Formula (Expected)**:
```
Target Units = (Fixed Costs + Target Profit) / (Price - Variable Cost)
```

**Implementation**: [TO BE EXTRACTED]

**Status**: ⏳ Pending verification

---

## Verification Results

### Phase 1: Formula Extraction
- [ ] Cohort Service - 4 functions
- [ ] Attribution Service - 4 functions
- [ ] Forecast Service - 5 functions
- [ ] Segmentation Service - 4 functions
- [ ] Breakeven Service - 3 functions

### Phase 2: Business Rule Comparison
- [ ] Compare against `docs/kpi-definitions.md`
- [ ] Compare against `docs/commission-lifecycle-business-rules.md`
- [ ] Document discrepancies

### Phase 3: Edge Case Testing
- [ ] Zero division protection
- [ ] NULL handling
- [ ] Empty array handling
- [ ] Single data point scenarios

### Phase 4: Cross-Component Consistency
- [ ] Verify same metrics across components
- [ ] Check aggregation consistency

---

## Discrepancies Found

### Critical Issues
*None yet - extraction in progress*

### Minor Issues
*None yet - extraction in progress*

### Recommendations
*To be populated after verification*

---

## Next Steps
1. ⏳ Extract actual formulas from each service file
2. Compare implementations with business rules
3. Test with known datasets
4. Document any discrepancies
5. Create remediation plan for issues found

---

**Last Updated**: Oct 11, 2025
**Reviewer**: Claude Code
**Status**: IN PROGRESS - Formula extraction phase
