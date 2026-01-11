<!-- docs/underwriting-wizard-architecture.md -->
# Underwriting Wizard - High-Level Knowledge Document

## Document Purpose
This document provides a comprehensive overview of the Underwriting Wizard feature implementation, covering architecture, decision logic, performance characteristics, and accuracy considerations.

---

## 1. Architecture Overview

### System Type: **HYBRID (AI + Deterministic Rule Engine)**

The UW Wizard is **NOT** purely AI and **NOT** purely a traditional decision tree. It's a **hybrid system** that combines:

1. **Claude AI (Anthropic)** - For intelligent health tier assessment and carrier recommendations
2. **4-Stage Deterministic Rule Engine** - For eligibility filtering, approval scoring, premium calculation, and ranking
3. **Optional Custom Decision Trees** - For admin-defined routing rules (stored in `underwriting_decision_trees` table)

### Component Architecture

```
UnderwritingWizard.tsx (Main Container)
├── 5 Wizard Steps:
│   ├── ClientInfoStep (demographics, BMI calculation)
│   ├── HealthConditionsStep (conditions, tobacco, medications)
│   ├── CoverageRequestStep (face amount, product types)
│   ├── ReviewStep (summary, triggers BOTH analysis engines)
│   └── RecommendationsStep (displays results from both engines)
│
├── Services:
│   ├── decisionEngine.ts (4-stage rule engine, 711 lines)
│   ├── premiumMatrixService.ts (rate lookup & interpolation, 756 lines)
│   ├── quickQuoteCalculator.ts (in-memory fast quoting, 581 lines)
│   ├── quotingService.ts (async comprehensive quoting, 714 lines)
│   ├── acceptanceService.ts (condition → carrier decisions, 413 lines)
│   └── ProductEligibilityService.ts (pre-filtering, 257 lines)
│
└── Supabase Edge Functions:
    └── underwriting-ai-analyze/
        ├── index.ts (Claude AI integration)
        ├── criteria-evaluator.ts (extracted criteria rules)
        └── rule-evaluator.ts (decision tree evaluation)
```

---

## 2. How It Works

### Wizard Flow (5 Steps)

| Step | Component | Data Collected | Validation |
|------|-----------|----------------|------------|
| 1 | ClientInfoStep | DOB, age, gender, state, height, weight | Age 18-100, gender required, state required |
| 2 | HealthConditionsStep | Health conditions, tobacco use, medications | Optional (no validation) |
| 3 | CoverageRequestStep | Face amount, product types | Face amount ≥ $10K, ≥1 product type |
| 4 | ReviewStep | N/A (display only) | Triggers BOTH analysis engines |
| 5 | RecommendationsStep | N/A (results display) | Save session to DB |

### Analysis Flow (Parallel Execution)

When user completes Step 4 (Review), **BOTH** engines fire simultaneously:

```
User Clicks "Get Recommendations"
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐ ┌─────────────┐
│ AI      │ │ Decision    │
│ Engine  │ │ Engine      │
└────┬────┘ └──────┬──────┘
     │             │
     ▼             ▼
┌─────────────────────────────┐
│ RecommendationsStep         │
│ - AI: Health tier, risks    │
│ - Engine: Ranked products   │
└─────────────────────────────┘
```

---

## 3. The 4-Stage Decision Engine

**File:** `src/services/underwriting/decisionEngine.ts`

This is the **CORE** of the recommendation system - a deterministic, rule-based engine (NOT machine learning).

### Stage 1: Eligibility Filter
**Purpose:** Filter out products the client cannot qualify for.

**Checks:**
- ✅ **Age limits** (`min_age`, `max_age` from products table)
- ✅ **Face amount limits** (base + age-tiered from `product.metadata`)
- ✅ **Knockout conditions** (hard disqualifiers from product metadata AND extracted criteria)
- ✅ **State availability** (available/unavailable states)
- ✅ **Extracted criteria** (from `carrier_underwriting_criteria` table, AI-extracted, human-approved)

### Stage 2: Approval Scoring
**Purpose:** Calculate approval likelihood based on health conditions.

**Logic:**
```
For each eligible product:
  1. Query carrier_condition_acceptance for each health condition
  2. Get acceptance decision: approved | table_rated | case_by_case | declined
  3. If ANY condition is "declined" → product gets 0% approval
  4. Otherwise: approval_likelihood = MINIMUM of all condition likelihoods
  5. Health class = worst (lowest priority) condition result
```

**Health Class Priority:**
`preferred_plus (0) → preferred (1) → standard_plus (2) → standard (3) → table_rated (4) → decline (5)`

### Stage 3: Premium Calculation
**Purpose:** Get monthly premium using bilinear interpolation on premium matrices.

**Matrix Dimensions:**
- Age (5-year increments: 20-85)
- Face Amount (product-specific grids)
- Gender (male/female)
- Tobacco Class (non-tobacco/tobacco)
- Health Class (preferred_plus through table_rated)
- Term Years (10, 15, 20, 25, 30 for term products)

**Interpolation Algorithm:**
1. **Exact match:** Direct lookup if age & face amount exist
2. **CPT calculation:** If only ONE face amount exists, derive cost-per-thousand and scale
3. **Bilinear interpolation:** With multiple face amounts, interpolate along both dimensions

### Stage 4: Ranking & Selection
**Purpose:** Select up to 4 recommendations based on different criteria.

**Categories:**
1. **Best Value** - Highest composite score: `(40% × approval) + (60% × normalized_premium)`
2. **Cheapest** - Lowest monthly premium
3. **Best Approval** - Highest approval likelihood
4. **Highest Coverage** - Maximum face amount available

---

## 4. Min/Max Face Amount Handling

### ✅ YES - Fully Implemented

**Configuration Storage:**
- `products.min_face_amount` / `products.max_face_amount` (base limits)
- `products.metadata.ageTieredFaceAmounts` (age-specific overrides)
- `carrier_underwriting_criteria.criteria.faceAmountLimits` (extracted from guides)

**Age-Tiered Example:**
```typescript
ageTieredFaceAmounts: [
  { minAge: 18, maxAge: 50, maxFaceAmount: 1000000 },
  { minAge: 51, maxAge: 65, maxFaceAmount: 500000 },
  { minAge: 66, maxAge: 85, maxFaceAmount: 250000 }
]
```

**Evaluation Logic (`ProductEligibilityService.ts`):**
```typescript
getMaxFaceAmount(product, clientAge):
  1. Check age-tiered limits first (more specific)
  2. Find tier where clientAge >= minAge && <= maxAge
  3. Return tier.maxFaceAmount OR product.max_face_amount as fallback
```

---

## 5. Premium Matrix Integration

### ✅ YES - Rates Sorted by Cost (Lowest to Highest)

**File:** `src/services/underwriting/premiumMatrixService.ts`

**Face Amount Grids by Product Type:**
| Product Type | Face Amount Range |
|--------------|-------------------|
| Term Life | $25K - $1M (9 tiers) |
| Whole Life | $5K - $50K (5K increments) |
| Participating WL | $5K - $300K (mixed) |
| Final Expense | $5K - $50K |

**Sorting Logic:**
The decision engine calculates **cost-per-thousand (CPT)** for each product:
```typescript
cpt = (annualPremium / (faceAmount / 1000))
```

Products are ranked by:
1. Composite score (approval × cost efficiency)
2. CPT for "Cheapest" category
3. Approval likelihood for "Best Approval" category

**Missing Rates:** LGA TERM and SBLI TERM require manual entry.

---

## 6. Knockout Conditions

### ✅ YES - Fully Implemented

**Definition Storage:**
- `products.metadata.knockoutConditions.conditionCodes[]`
- `carrier_underwriting_criteria.criteria.knockoutConditions`

**Evaluation (`ProductEligibilityService.ts`):**
```typescript
hasKnockoutCondition(product, clientConditions):
  1. Get knockout codes from product metadata
  2. Use Set lookup for O(1) matching (case-insensitive)
  3. If ANY client condition matches → INELIGIBLE
  4. Return matching condition codes for display
```

**UI Display:**
- Ineligible products shown in separate section
- Specific knockout reasons displayed to user

---

## 7. AI Component (Claude Integration)

**Location:** `supabase/functions/underwriting-ai-analyze/`

### What AI Does:
1. **Health Tier Assignment** - Assigns client to tier (preferred_plus → decline)
2. **Risk Factor Analysis** - Extracts key risk factors from profile
3. **Carrier Recommendations** - AI-driven suggestions with confidence scores
4. **Rating Explanation** - Human-readable reasoning

### What AI Does NOT Do:
- Premium calculation (handled by decision engine)
- Eligibility filtering (handled by decision engine)
- Final product selection (handled by decision engine)

### AI + Decision Tree Integration:
The AI receives `treeMatchedRules` from the decision tree evaluator to boost confidence on matching products.

---

## 8. Performance Characteristics

### ✅ Performant Design

| Aspect | Implementation |
|--------|----------------|
| **Parallel Execution** | AI and Decision Engine run simultaneously |
| **In-Memory Quoting** | `quickQuoteCalculator.ts` - NO async, NO DB calls |
| **RPC Pagination** | Bypasses Supabase 1000-row limit for large datasets |
| **Query Caching** | TanStack Query with 1-hour stale time for reference data |
| **Lazy Loading** | Health conditions loaded on demand, not at startup |
| **Set Lookups** | O(1) knockout condition matching via Set |

### Performance Bottlenecks:
1. **Initial premium matrix fetch** - Large datasets for IMOs with many products
2. **AI edge function cold start** - First request may be slower
3. **Multiple carrier acceptance lookups** - One query per condition × carrier

### Optimization Opportunities:
- Batch condition acceptance lookups
- Pre-compute CPT values in premium matrix
- Cache AI responses for similar profiles

---

## 9. Accuracy Considerations

### Data Quality Dependencies:

| Data Source | Impact on Accuracy |
|-------------|-------------------|
| `carrier_condition_acceptance` | High - Determines approval likelihood |
| `premium_matrix` | High - Determines premium accuracy |
| `carrier_underwriting_criteria` | Medium - AI-extracted, human-approved rules |
| `products.metadata` | Medium - Age-tiered limits, knockouts |
| `underwriting_decision_trees` | Low - Optional custom routing |

### Known Limitations:
1. **Premium matrix completeness** - LGA TERM and SBLI TERM require manual entry
2. **Condition coverage** - Not all carrier × condition combinations may have rules
3. **State availability** - May not be fully populated for all carriers
4. **AI hallucination risk** - Claude may suggest products not in database

### Accuracy Safeguards:
- ✅ Extracted criteria require human approval before use
- ✅ Eligibility filtering happens BEFORE AI recommendations shown
- ✅ Ineligible products clearly separated in UI
- ✅ "No rule found" conditions flagged as concerns

---

## 10. Database Tables Involved

| Table | Purpose |
|-------|---------|
| `products` | Product definitions with min/max age, face amounts |
| `carriers` | Carrier information |
| `premium_matrix` | Rate tables by age/face/gender/tobacco/health class |
| `carrier_condition_acceptance` | Per-carrier health condition decisions |
| `carrier_underwriting_criteria` | AI-extracted underwriting rules |
| `underwriting_health_conditions` | Master list of health conditions |
| `underwriting_decision_trees` | Custom admin-defined routing rules |
| `underwriting_sessions` | Saved wizard sessions with results |

---

## 11. Key Files Reference

### Services Layer
- `src/services/underwriting/decisionEngine.ts` - Core 4-stage engine
- `src/services/underwriting/premiumMatrixService.ts` - Rate lookup & interpolation
- `src/services/underwriting/acceptanceService.ts` - Condition acceptance rules
- `src/services/underwriting/ProductEligibilityService.ts` - Eligibility checks
- `src/services/underwriting/quickQuoteCalculator.ts` - In-memory quoting
- `src/services/underwriting/quotingService.ts` - Async comprehensive quoting

### Components
- `src/features/underwriting/components/UnderwritingWizard.tsx` - Main wizard
- `src/features/underwriting/components/WizardSteps/` - All 5 step components
- `src/features/underwriting/components/RateEntry/` - Premium matrix admin UI

### Hooks
- `src/features/underwriting/hooks/useUnderwritingAnalysis.ts` - AI mutation
- `src/features/underwriting/hooks/useDecisionEngineRecommendations.ts` - Engine mutation
- `src/features/underwriting/hooks/useProductConstraints.ts` - Constraint loading

### Types
- `src/features/underwriting/types/underwriting.types.ts` - Core wizard types
- `src/features/underwriting/types/product-constraints.types.ts` - Constraint types

---

## 12. Summary

| Question | Answer |
|----------|--------|
| Is it AI? | **Partially** - Claude AI for health analysis |
| Is it decision tree? | **Partially** - Optional custom trees for routing |
| Is it hybrid? | **YES** - AI + 4-stage deterministic rule engine |
| Min/max face amounts? | **YES** - Product-level + age-tiered |
| Premium matrix sorting? | **YES** - CPT-based ranking, lowest to highest |
| Knockout conditions? | **YES** - Stored in product metadata + extracted criteria |
| Performant? | **YES** - Parallel execution, in-memory calculations, caching |

---

## 13. Production-Grade Code Review

### 1️⃣ CORRECTNESS & LOGIC

#### ✅ Well-Implemented
- **Bilinear interpolation** (`premiumMatrixService.ts:580-729`): Correctly handles edge cases (exact match, single face amount CPT calculation, partial corners)
- **Age-tiered limits** (`ProductEligibilityService.ts:37-45`): Properly finds matching tier with bounds checking
- **Parallel analysis** (`UnderwritingWizard.tsx:230-241`): Both AI and Decision Engine fire concurrently

#### ⚠️ Potential Issues

| Location | Issue | Severity | Impact |
|----------|-------|----------|--------|
| `decisionEngine.ts:284` | Returns `"standard"` health class when declined - should probably return `"decline"` | Medium | Misleading health class for declined clients |
| `decisionEngine.ts:265-273` | Missing acceptance rule defaults to `case_by_case` with 0.5 likelihood - may be too optimistic | Low | Over-estimates approval for unknown conditions |
| `premiumMatrixService.ts:691-694` | Averaging corners when < 2 available may produce inaccurate estimates | Low | Edge case for sparse matrices |

---

### 2️⃣ ARCHITECTURE & BOUNDARIES

#### ✅ Good Separation
- **Services layer** clearly separates concerns:
  - `decisionEngine.ts` - 4-stage recommendation logic
  - `premiumMatrixService.ts` - Rate lookup & interpolation
  - `acceptanceService.ts` - Condition acceptance rules
  - `ProductEligibilityService.ts` - Pre-filtering
- **TanStack Query hooks** properly manage caching and state
- **Type definitions** in dedicated `types/` directory

#### ⚠️ Architecture Concerns

| Issue | Location | Recommendation |
|-------|----------|----------------|
| `ProductEligibilityService` uses singleton pattern | Line 256 | Per CLAUDE.md, services should NOT use singleton - export instance directly |
| Duplicate eligibility logic | `decisionEngine.ts:102-208` vs `ProductEligibilityService.ts:107-169` | Consider consolidating to avoid drift |
| Direct Supabase calls in services | All services | Consider using Repository pattern per codebase standards |

---

### 3️⃣ TYPE SAFETY & STATIC ANALYSIS

#### ✅ Strong Typing
- Uses `Database["public"]` types from `database.types.ts`
- Proper enum types for `HealthClass`, `TobaccoClass`, `GenderType`
- Generic types in service functions

#### ⚠️ Type Safety Issues

| Location | Issue | Fix |
|----------|-------|-----|
| `decisionEngine.ts:253` | Unsafe cast: `acceptance.acceptance as AcceptanceDecision` | Validate against known values first |
| `decisionEngine.ts:312-314` | Cast `healthClassResult` to `HealthClass` without validation | Add runtime check for `table_*` prefix |
| `decisionEngine.ts:440` | `ExtractedCriteria` cast from unknown: `data?.criteria as unknown as ExtractedCriteria` | Use Zod schema validation |
| `premiumMatrixService.ts:178` | Cast: `(data || []) as PremiumMatrix[]` | Should validate structure |

---

### 4️⃣ ERROR HANDLING & RESILIENCE

#### ✅ Good Patterns
- Try-catch in `getPremium()` with console.error and null return
- Error messages include context (e.g., `error.message`)
- Graceful degradation when premium matrix missing

#### ⚠️ Error Handling Issues

| Location | Issue | Severity |
|----------|-------|----------|
| `decisionEngine.ts:359-362` | `getPremium` catches errors silently, returns null - no logging of which product failed | Medium |
| `premiumMatrixService.ts:424-431` | Delete error swallowed with "continue anyway" comment | Medium |
| `UnderwritingWizard.tsx:232-235` | AI failure sets generic error, doesn't prevent navigation | Low |
| All services | No retry logic for transient Supabase failures | Low |

**Missing Error Handling:**
- No timeout handling for long-running queries
- No circuit breaker for repeated failures
- No fallback when premium matrix completely unavailable

---

### 5️⃣ SECURITY REVIEW

#### ✅ Security Strengths
- Uses Supabase RLS (Row Level Security) implicitly via `imo_id` filtering
- No SQL string concatenation - uses parameterized queries
- User ID passed from authenticated context

#### ⚠️ Security Concerns

| Location | Issue | Severity | Recommendation |
|----------|-------|----------|----------------|
| `decisionEngine.ts:392` | `.or(\`imo_id.eq.${imoId},imo_id.is.null\`)` uses string interpolation | Medium | Use Supabase's proper OR filter syntax |
| `acceptanceService.ts:192` | `.or(\`product_type.eq.${productType},product_type.is.null\`)` same issue | Medium | Potential injection if productType unvalidated |
| `UnderwritingWizard.tsx:218-227` | `user?.imo_id \|\| ""` sends empty string if no imo_id | Low | Should validate user has imo_id before proceeding |

**Authorization Gaps:**
- No explicit check that user can access products for the given `imo_id`
- Missing validation that user belongs to the IMO they're querying

---

### 6️⃣ PERFORMANCE & SCALABILITY

#### ✅ Performance Wins
- **Parallel pagination** in `getAllPremiumMatricesForIMO()` with `Promise.all()`
- **Single fetch optimization** for datasets ≤1000 rows
- **Query caching** via TanStack Query (1-hour stale time for reference data)
- **In-memory quick quote** calculation without DB calls

#### ⚠️ Performance Issues

| Location | Issue | Impact |
|----------|-------|--------|
| `decisionEngine.ts:505-540` | **Sequential N+1 pattern**: For each product, makes 3 sequential async calls | High - slow for many products |
| `decisionEngine.ts:507` | `getExtractedCriteria()` called per product | High - should batch |
| `decisionEngine.ts:513` | `calculateApproval()` calls `lookupAcceptance()` per condition | High - N queries per product |
| `decisionEngine.ts:523` | `getPremium()` fetches full matrix per product | High - should batch |

**Recommendations:**
1. Batch fetch all extracted criteria upfront
2. Batch fetch all acceptance rules for relevant carriers
3. Pre-fetch premium matrices for all products in one query
4. Consider caching premium matrices at IMO level

**Estimated Impact:** For 50 products × 5 conditions, current approach = ~250 DB queries. Batched = ~5 queries.

---

### 7️⃣ CONSISTENCY & MAINTAINABILITY

#### ✅ Consistent Patterns
- Consistent naming conventions (camelCase functions, PascalCase types)
- Consistent error message format
- Well-structured file organization

#### ⚠️ Inconsistencies

| Issue | Locations |
|-------|-----------|
| Health class naming varies | `"preferred_plus"` vs `"table_a"` vs `"decline"` - inconsistent enum values |
| Duplicate type definitions | `HealthClass` in `premiumMatrixService.ts` could drift from DB enum |
| Magic numbers | `0.95` default likelihood, `0.5` case_by_case likelihood hardcoded |
| Inconsistent null handling | Some functions return `null`, others throw |

---

### 8️⃣ TESTABILITY & FUTURE RISK

#### ⚠️ Testability Issues

| Issue | Recommendation |
|-------|----------------|
| Direct Supabase calls in services | Inject supabase client for mocking |
| `calculateApproval()` has side effects (DB queries) | Extract pure calculation logic |
| No unit tests visible for core services | Add tests for interpolation edge cases |

**High-Risk Areas for Regressions:**
1. `interpolatePremium()` - Complex branching logic with 5+ code paths
2. `checkEligibility()` - Multiple overlapping constraint checks
3. `determineHealthClass()` - Priority logic for health class selection

---

### 9️⃣ DATABASE & MIGRATION REQUIREMENTS

#### ✅ Current State
- Uses `database.types.ts` as source of truth
- RPC function `get_premium_matrices_for_imo` for pagination

#### ⚠️ Potential Issues

| Issue | Recommendation |
|-------|----------------|
| No indexes mentioned for common queries | Ensure indexes on `(imo_id, product_id)` combinations |
| Missing migration for `carrier_underwriting_criteria` structure | Verify criteria JSONB schema is documented |

---

### 10. Critical Findings Summary

| Priority | Count | Examples |
|----------|-------|----------|
| **High** | 3 | N+1 query pattern, SQL string interpolation security, sequential DB calls |
| **Medium** | 6 | Unsafe type casts, swallowed errors, authorization gaps |
| **Low** | 5 | Magic numbers, inconsistent null handling, missing retry logic |

### Top 5 Recommendations

1. **PERF**: Refactor `getRecommendations()` to batch all DB calls upfront instead of per-product
2. **SEC**: Replace string interpolation in `.or()` with proper Supabase filter syntax
3. **TYPE**: Add Zod schemas for JSON fields (`ExtractedCriteria`, `criteria` column)
4. **ERR**: Add structured logging for failed lookups with context (product ID, condition codes)
5. **ARCH**: Consolidate eligibility logic between `decisionEngine.ts` and `ProductEligibilityService.ts`

---

*Document generated: 2026-01-11*
*Based on codebase exploration of commissionTracker UW Wizard feature*
