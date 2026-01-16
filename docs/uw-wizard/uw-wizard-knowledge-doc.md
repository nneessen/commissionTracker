# UW Wizard Comprehensive Knowledge Document

> **Last Updated:** 2026-01-14
> **Scope:** Premium Rates, Age-Tiered Face Amounts, Carrier Acceptance Rules, Decision Making Process
> **Status:** Production Analysis

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Files Inventory](#2-critical-files-inventory)
3. [Premium Rate Fetching System](#3-premium-rate-fetching-system)
4. [Age-Tiered Min/Max Face Amounts](#4-age-tiered-minmax-face-amounts)
5. [Carrier Acceptance Rules](#5-carrier-acceptance-rules)
6. [Decision Making Process (4-Stage Engine)](#6-decision-making-process-4-stage-engine)
7. [Edge Functions](#7-edge-functions)
8. [Missing Edge Cases](#8-missing-edge-cases)
9. [Performance Bottlenecks](#9-performance-bottlenecks)
10. [Requirements Summary](#10-requirements-summary)

---

## 1. Executive Summary

The UW Wizard is a **HYBRID system** combining:
- **Claude AI** (Anthropic) for health tier assessment and intelligent recommendations
- **4-Stage Deterministic Rule Engine** for eligibility, approval, premium calculation, and ranking
- **Rule Engine v2** (compound predicates) for advanced rule evaluation (partially integrated)

### Key Architecture Pattern
```
User Input → Parallel Execution:
                ├── AI Engine (Claude) → Health tier, risk factors
                └── Decision Engine → Eligibility → Approval → Premium → Ranked Recommendations
            → Combined Results → UI Display
```

---

## 2. Critical Files Inventory

### Core Services (src/services/underwriting/)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `decisionEngine.ts` | ~1,300 | 4-stage recommendation engine | **CRITICAL** |
| `premiumMatrixService.ts` | ~1,050 | Premium lookup & bilinear interpolation | **CRITICAL** |
| `acceptanceService.ts` | ~400 | Carrier condition acceptance rules (v1) | Active |
| `ProductEligibilityService.ts` | ~260 | Pre-filtering by age, face amount, knockouts | Active |
| `ruleEngineDSL.ts` | ~600 | Rule Engine v2 predicate schema | Complete |
| `ruleEvaluator.ts` | ~760 | Rule Engine v2 evaluation logic | Complete |
| `ruleService.ts` | ~620 | Rule CRUD operations | Complete |
| `conditionMatcher.ts` | ~200 | Condition response evaluation | Active |
| `criteriaService.ts` | ~150 | Extracted criteria management | Active |
| `quotingService.ts` | ~700 | Async comprehensive quoting | Active |
| `quickQuoteCalculator.ts` | ~580 | In-memory fast quoting | Active |

### UI Components (src/features/underwriting/components/)

| Component | Purpose |
|-----------|---------|
| `UnderwritingWizard.tsx` | Main wizard container, step orchestration |
| `WizardSteps/ClientInfoStep.tsx` | Demographics, BMI calculation |
| `WizardSteps/HealthConditionsStep.tsx` | Conditions, tobacco, medications |
| `WizardSteps/CoverageRequestStep.tsx` | Face amount, product types |
| `WizardSteps/ReviewStep.tsx` | Summary, triggers analysis |
| `WizardSteps/RecommendationsStep.tsx` | Results display from both engines |
| `RuleEngine/*.tsx` | Rule set management UI |
| `RateEntry/*.tsx` | Premium matrix admin UI |
| `AcceptanceRules/*.tsx` | Acceptance rule management |

### Hooks (src/features/underwriting/hooks/)

| Hook | Purpose |
|------|---------|
| `useDecisionEngineRecommendations.ts` | Decision engine mutation |
| `useUnderwritingAnalysis.ts` | AI analysis mutation |
| `usePremiumMatrix.ts` | Premium matrix queries |
| `useAcceptance.ts` | Acceptance rule queries |
| `useRuleSets.ts` | Rule set CRUD |
| `useProductConstraints.ts` | Product constraint loading |

### Edge Functions (supabase/functions/)

| Function | Purpose |
|----------|---------|
| `extract-underwriting-criteria/` | AI extraction of criteria from parsed guides |
| `parse-underwriting-guide/` | PDF parsing with unpdf/pdfjs |
| `underwriting-ai-analyze/` | Claude AI analysis with decision tree integration |

---

## 3. Premium Rate Fetching System

### File: `src/services/underwriting/premiumMatrixService.ts`

### Key Functions

#### `interpolatePremium()` (lines 964-1048)
Primary premium lookup with health class fallback.

```typescript
interpolatePremium(
  matrix: PremiumMatrix[],
  targetAge: number,
  targetFaceAmount: number,
  gender: GenderType,
  tobaccoClass: TobaccoClass,
  healthClass: string,
  termYears?: TermYears | null
): PremiumLookupResult
```

**Flow:**
1. Normalize health class (`normalizeHealthClass()`)
2. Handle non-rateable classes (decline, refer) → return `{ premium: null, reason: "NON_RATEABLE_CLASS" }`
3. Try fallback order: `preferred_plus → preferred → standard_plus → standard → table_rated`
4. For each class, attempt `tryInterpolatePremiumForClass()`
5. Return first successful match with metadata (requested vs used class)

#### `tryInterpolatePremiumForClass()` (lines 790-962)
Bilinear interpolation implementation.

**Algorithm:**
1. Filter matrix by gender, tobacco, health class, term
2. **Exact match**: Direct lookup if age & face amount exist
3. **CPT calculation**: If single face amount, derive cost-per-thousand and scale
4. **Bilinear interpolation**: With multiple face amounts, interpolate using 4 corners

### Health Class Fallback Order
```typescript
const HEALTH_CLASS_FALLBACK_ORDER: RateableHealthClass[] = [
  'preferred_plus',
  'preferred',
  'standard_plus',
  'standard',
  'table_rated'
];
```

### Premium Matrix Dimensions
| Dimension | Values |
|-----------|--------|
| Gender | `male`, `female` |
| Tobacco | `tobacco`, `non_tobacco` |
| Health Class | `preferred_plus` through `table_rated` |
| Age Grid | 20, 25, 30, 35... up to 85 (5-year increments) |
| Face Amount | Product-specific grids |
| Term Years | 10, 15, 20, 25, 30 (null for permanent) |

### Face Amount Grids by Product Type
| Product Type | Range |
|--------------|-------|
| Term Life | $25K - $1M |
| Whole Life | $5K - $50K |
| Participating WL | $5K - $300K |
| Final Expense | $5K - $50K |

---

## 4. Age-Tiered Min/Max Face Amounts

### Implementation Locations

1. **Decision Engine**: `decisionEngine.ts:203-235` - `getMaxFaceAmountForAgeTerm()`
2. **Product Eligibility Service**: `ProductEligibilityService.ts:29-48` - `getMaxFaceAmount()`
3. **Eligibility Check**: `decisionEngine.ts:241-418` - `checkEligibility()`

### Key Function: `getMaxFaceAmountForAgeTerm()`

```typescript
function getMaxFaceAmountForAgeTerm(
  metadata: ProductMetadata | null | undefined,
  productMaxFace: number | null | undefined,
  clientAge: number,
  termYears: number | null | undefined
): number
```

**Logic:**
1. Start with product-level max (`productMaxFace`)
2. Check `metadata.ageTieredFaceAmounts.tiers[]`
3. For each tier: if `clientAge >= tier.minAge && clientAge <= tier.maxAge`:
   - Use `tier.maxFaceAmount` as base
   - Check `tier.termRestrictions[]` for term-specific limits
   - Apply most restrictive limit
4. Return `Math.min()` of all applicable limits

### Data Structure (Product Metadata)

```typescript
interface AgeTieredFaceAmounts {
  tiers: Array<{
    minAge: number;
    maxAge: number;
    maxFaceAmount: number;
    termRestrictions?: Array<{
      termYears: number;
      maxFaceAmount: number;
    }>;
  }>;
}
```

### Example Configuration
```json
{
  "ageTieredFaceAmounts": {
    "tiers": [
      { "minAge": 18, "maxAge": 50, "maxFaceAmount": 1000000 },
      { "minAge": 51, "maxAge": 65, "maxFaceAmount": 500000 },
      {
        "minAge": 66,
        "maxAge": 85,
        "maxFaceAmount": 250000,
        "termRestrictions": [
          { "termYears": 10, "maxFaceAmount": 200000 },
          { "termYears": 15, "maxFaceAmount": 150000 }
        ]
      }
    ]
  }
}
```

### Storage Locations
- `products.metadata.ageTieredFaceAmounts` (JSONB)
- `carrier_underwriting_criteria.criteria.faceAmountLimits` (extracted from guides)

---

## 5. Carrier Acceptance Rules

### V1 System (Current Active)
**File:** `src/services/underwriting/acceptanceService.ts`

#### `lookupAcceptance()` Function
```typescript
lookupAcceptance(
  carrierId: string,
  conditionCode: string,
  imoId: string,
  productType?: ProductType,
  reviewStatus?: RuleReviewStatus
): Promise<AcceptanceRow | null>
```

**Query Logic:**
1. Filter by `carrier_id`, `condition_code`, `imo_id`
2. Filter by `review_status='approved'` (default)
3. Match `product_type` OR `product_type IS NULL` (universal rules)
4. Return acceptance decision with health class result

#### Acceptance Decision Types
| Decision | Description | Impact |
|----------|-------------|--------|
| `approved` | Standard acceptance | Normal processing |
| `table_rated` | Rated with extra premium | Apply table rating |
| `case_by_case` | Manual review required | 0.5 likelihood default |
| `declined` | Not accepted | 0% approval, product filtered |

#### Health Class Results
```typescript
const HEALTH_CLASS_OPTIONS = [
  'preferred_plus', 'preferred', 'standard_plus', 'standard',
  'table_a', 'table_b', 'table_c', 'table_d',  // Tables 1-4
  'table_e', 'table_f', 'table_g', 'table_h',  // Tables 5-8
  'decline', 'refer', 'unknown'
];
```

### V2 System (Rule Engine - Partially Integrated)
**Files:** `ruleEngineDSL.ts`, `ruleEvaluator.ts`

#### Predicate Types
- **Logical**: `all` (AND), `any` (OR), `not`
- **Numeric**: `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `between`
- **Date**: `years_since_gte`, `years_since_lte`, `months_since_gte`
- **Boolean**: `eq`
- **String**: `eq`, `ne`, `in`, `not_in`, `starts_with`, `contains`
- **Array**: `contains`, `contains_all`, `contains_any`
- **Set**: `in`, `not_in`
- **Null Check**: `is_null`, `is_not_null`
- **Condition Presence**: `has_condition`, `lacks_condition`

#### Evaluation Result Types
```typescript
type EligibilityStatus = 'eligible' | 'ineligible' | 'unknown';
type PredicateResult = 'matched' | 'failed' | 'unknown';
```

#### Rule Set Schema
```typescript
interface UnderwritingRuleSet {
  id: string;
  carrier_id: string;
  imo_id: string;
  product_id?: string;
  condition_code?: string;
  scope: 'condition_specific' | 'global';
  review_status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  rules: UnderwritingRule[];
  default_outcome: RuleOutcome;
}
```

---

## 6. Decision Making Process (4-Stage Engine)

### File: `src/services/underwriting/decisionEngine.ts`

### Main Entry Point: `getRecommendations()`

```typescript
async function getRecommendations(
  input: DecisionEngineInput
): Promise<DecisionEngineResult>
```

### Stage 1: Eligibility Filter (lines 241-418)

**Function:** `checkEligibility()`

**Checks Performed:**
1. **Age Limits**: `client.age` vs `product.minAge/maxAge`
2. **Face Amount**: `coverage.faceAmount` vs age-tiered max
3. **Term-Specific Limits**: `termYears` restrictions within age tiers
4. **Extracted Criteria**: AI-extracted limits from `carrier_underwriting_criteria`
5. **Knockout Conditions**: Hard disqualifiers from product metadata
6. **State Availability**: Available/unavailable states

**Output:**
```typescript
interface EligibilityResult {
  status: 'eligible' | 'ineligible' | 'unknown';
  reasons: string[];
  missingFields: MissingFieldInfo[];
  confidence: number; // 0-1
}
```

### Stage 2: Approval Scoring (lines 429-551)

**Function:** `_calculateApproval()` / `calculateApprovalV2()`

**Flow:**
1. No conditions = healthy client (95% likelihood, preferred class)
2. Fetch draft rules for FYI display (doesn't affect scoring)
3. For each condition:
   - Look up approved acceptance rule
   - Get decision and health class result
   - Track concerns (declined, case_by_case, table_rated)
4. If ANY condition declined → 0% likelihood
5. Calculate overall likelihood = `Math.min()` of all condition likelihoods
6. Determine final health class (worst rank wins)

**Health Class Ranking:**
```typescript
const HEALTH_CLASS_RANK = {
  'preferred_plus': 0,
  'preferred': 1,
  'standard_plus': 2,
  'standard': 3,
  'substandard': 4,
  'decline': 5,
  'refer': 5,
  'unknown': 3  // Default to standard
};
```

### Stage 3: Premium Calculation (lines 890-980)

**Steps:**
1. Get premium matrix for product
2. Get available terms for client age
3. Determine term to use:
   - Permanent products: `null` (ignore term selection)
   - Term products: requested term if available, else longest available
4. Call `interpolatePremium()` with health class from Stage 2
5. Calculate alternative quotes at different face amounts
6. Track health class fallback if used

**Premium Result:**
```typescript
interface PremiumLookupResult {
  premium: number | null;
  requested?: RateableHealthClass;
  used?: RateableHealthClass;
  wasExact?: boolean;
  termYears?: number | null;
  reason?: 'NO_MATRIX' | 'NON_RATEABLE_CLASS' | 'NO_MATCHING_RATES';
}
```

### Stage 4: Ranking & Selection (lines 1100-1200)

**Scoring Formula:**
```typescript
const rawScore = (approval.likelihood * 0.4) + (priceScore * 0.6);
const finalScore = rawScore * confidenceMultiplier;
```

**Recommendation Categories:**
1. **Best Value**: Highest composite score
2. **Cheapest**: Lowest monthly premium
3. **Best Approval**: Highest approval likelihood
4. **Highest Coverage**: Maximum face amount available

**Unknown Eligibility Handling:**
- Products with `status: 'unknown'` are kept but ranked lower
- Confidence multiplier: `0.5 + (dataConfidence * 0.5)`
- Displayed separately in UI

---

## 7. Edge Functions

### 7.1 parse-underwriting-guide

**File:** `supabase/functions/parse-underwriting-guide/index.ts`

**Purpose:** Extract text from uploaded PDF guides

**Flow:**
1. Authenticate user and verify IMO admin role
2. Fetch guide record and validate parsing_status
3. Download PDF from Supabase storage
4. Validate file size (max 50MB)
5. Use unpdf/pdfjs to extract text page-by-page
6. Validate extracted content quality
7. Store parsed content as JSON in database

**Output:**
```typescript
interface ParsedContent {
  fullText: string;
  sections: Array<{ pageNumber: number; content: string }>;
  pageCount: number;
  metadata: { title?: string; author?: string };
}
```

### 7.2 extract-underwriting-criteria

**File:** `supabase/functions/extract-underwriting-criteria/index.ts`

**Purpose:** AI extraction of structured criteria from parsed guides

**Flow:**
1. Authenticate and verify admin role
2. Fetch guide with parsed_content
3. Validate content quality (min 5000 chars, real content)
4. Chunk text for API processing (40K chars/chunk, max 3 chunks)
5. Call Claude API for each chunk with extraction prompt
6. Merge extracted criteria from all chunks
7. Store in `carrier_underwriting_criteria` table

**Extracted Criteria Schema:**
```typescript
interface ExtractedCriteria {
  ageLimits?: { minIssueAge: number; maxIssueAge: number };
  faceAmountLimits?: {
    minimum: number;
    maximum: number;
    ageTiers?: Array<{ minAge: number; maxAge: number; maxFaceAmount: number }>;
  };
  knockoutConditions?: {
    conditionCodes: string[];
    descriptions: Array<{ code: string; name: string; severity: string }>;
  };
  buildRequirements?: { type: 'height_weight' | 'bmi'; ... };
  tobaccoRules?: { smokingClassifications: Array<...>; nicotineTestRequired: boolean };
  medicationRestrictions?: { insulin?: {...}; bloodThinners?: {...}; ... };
  stateAvailability?: { availableStates: string[]; unavailableStates: string[] };
}
```

### 7.3 underwriting-ai-analyze

**File:** `supabase/functions/underwriting-ai-analyze/index.ts`

**Purpose:** Claude AI analysis with criteria and decision tree integration

**Flow:**
1. Validate client profile and coverage request
2. Fetch carriers/products and filter by eligibility
3. Apply age-tiered face amount limits
4. Check knockout conditions
5. Check full underwriting threshold
6. Fetch and apply active criteria from `carrier_underwriting_criteria`
7. Evaluate decision tree rules if configured
8. Build AI prompt with all context
9. Call Claude API for health tier and recommendations
10. Merge tree evaluation with AI recommendations (hybrid scoring)

**Token Budget Controls:**
- Max guide chars: 15,000 across all guides
- Max excerpt length: 1,500 chars
- Max excerpts per guide: 5

---

## 8. Missing Edge Cases

### 8.1 Premium Calculation

| Edge Case | Current Handling | Risk Level |
|-----------|------------------|------------|
| **Sparse matrix** (< 4 corners for interpolation) | CPT fallback when single face amount | Medium |
| **No matrix data for product** | Returns `{ premium: null, reason: "NO_MATRIX" }` | Low |
| **Health class not in matrix** | Fallback chain to worse classes | Low |
| **Term not available for age** | Skips product entirely | Low |
| **Negative premium after interpolation** | Not checked | **High** |
| **Premium overflow for very high face amounts** | Not checked | Medium |

### 8.2 Age-Tiered Face Amounts

| Edge Case | Current Handling | Risk Level |
|-----------|------------------|------------|
| **Overlapping age tiers** | First matching tier used | Medium |
| **Gaps in age tiers** | Falls back to product max | Low |
| **Term restriction without base tier** | Ignores restriction | Medium |
| **Client age exactly on boundary** | Inclusive check (>=, <=) | Low |
| **Missing metadata** | Falls back to product-level limits | Low |

### 8.3 Acceptance Rules

| Edge Case | Current Handling | Risk Level |
|-----------|------------------|------------|
| **No rule for condition** | Defaults to `case_by_case`, 0.5 likelihood | Medium |
| **Multiple rules for same condition** | First match (by product_type specificity) | Medium |
| **Rule with null product_type** | Acts as universal rule | Low |
| **Draft rules** | Shown as FYI only, don't affect scoring | Low |
| **Rule for unknown condition code** | Silently ignored | Medium |

### 8.4 Decision Engine

| Edge Case | Current Handling | Risk Level |
|-----------|------------------|------------|
| **Empty product list** | Returns empty recommendations | Low |
| **All products ineligible** | Returns empty eligible, shows filtered | Low |
| **All products declined** | Returns empty recommendations | Low |
| **Missing conditionResponses** | Marks fields as missing, status=unknown | Low |
| **Invalid imoId** | Throws validation error | Low |
| **Client age < 0 or > 120** | Throws validation error | Low |
| **Face amount <= 0** | Throws validation error | Low |

### 8.5 Edge Functions

| Edge Case | Current Handling | Risk Level |
|-----------|------------------|------------|
| **PDF with scanned images (no OCR)** | Validation fails with clear message | Low |
| **PDF > 50MB** | Rejects with size error | Low |
| **Guide already being processed** | Returns 409 conflict | Low |
| **AI extraction returns invalid JSON** | Logs warning, returns null criteria | Medium |
| **Large guide exceeds token budget** | Truncates to 3 chunks | Medium |
| **Edge function timeout (50s)** | Partial results may be lost | **High** |

---

## 9. Performance Bottlenecks

### 9.1 Critical: N+1 Query Pattern in Decision Engine

**Location:** `decisionEngine.ts:850-1050` (getRecommendations loop)

**Problem:**
For each eligible product, makes sequential async calls:
1. `getExtractedCriteria()` - 1 query per product
2. `calculateApprovalV2()` - 1+ queries per product (per condition)
3. `getPremiumMatrixForProduct()` - 1 query per product
4. `interpolatePremium()` - CPU-bound per product

**Impact:**
- 50 products × 5 conditions = ~250 DB queries
- Sequential execution blocks parallelization
- Latency compounds with product count

**Recommendation:**
1. Batch fetch all extracted criteria upfront
2. Batch fetch all acceptance rules for relevant carriers
3. Pre-fetch premium matrices in single query
4. Process products in parallel chunks

### 9.2 Premium Matrix Fetch

**Location:** `premiumMatrixService.ts:getAllPremiumMatricesForIMO()`

**Problem:**
- Large IMOs may have 10,000+ premium matrix rows
- Uses pagination but still loads all into memory
- No filtering by requested products

**Recommendation:**
- Filter by product IDs in query
- Cache at IMO level with stale-while-revalidate

### 9.3 AI Edge Function Cold Start

**Location:** `underwriting-ai-analyze/index.ts`

**Problem:**
- First request experiences cold start latency
- Claude API call adds 2-5 seconds
- Large guide excerpts increase token processing time

**Recommendation:**
- Keep function warm with periodic pings
- Implement response caching for similar profiles
- Reduce excerpt size further

### 9.4 Rule Set Loading

**Location:** `ruleEvaluator.ts:evaluateRuleSet()`

**Problem:**
- Rules sorted on every evaluation
- Predicate parsed on every rule check
- No caching of parsed predicates

**Recommendation:**
- Pre-sort rules at load time
- Cache parsed predicates
- Use memoization for repeated evaluations

### 9.5 Memory Usage

**Locations:** Multiple

**Problem:**
- Premium matrices loaded fully into memory
- Guide excerpts concatenated as strings
- No streaming for large datasets

**Recommendation:**
- Use cursor-based iteration for large datasets
- Stream AI responses where possible
- Implement memory limits per request

---

## 10. Requirements Summary

### Functional Requirements (Current Implementation)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Premium rate lookup | **Complete** | With bilinear interpolation |
| Health class fallback | **Complete** | 5-level fallback chain |
| Age-tiered face amounts | **Complete** | With term restrictions |
| Knockout conditions | **Complete** | Product + criteria sources |
| Carrier acceptance rules v1 | **Complete** | Table-based lookup |
| Rule Engine v2 predicates | **Complete** | Not fully integrated |
| AI health analysis | **Complete** | Claude integration |
| Decision tree routing | **Complete** | Optional per IMO |
| Guide parsing (PDF) | **Complete** | unpdf/pdfjs |
| Criteria extraction | **Complete** | Claude AI |
| Session persistence | **Complete** | With recommendations |

### Non-Functional Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| < 5s response time | **Not Met** | N+1 pattern causes delays |
| Parallel execution | **Partial** | AI + Engine parallel, but internal queries serial |
| Error resilience | **Partial** | Some errors silently swallowed |
| Type safety | **Partial** | Some unsafe casts |
| Authorization | **Complete** | IMO-scoped access |

### Integration Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Rule Engine v2 not wired to decision engine | Rules created but not used | **High** |
| Batch query optimization needed | Performance degradation | **High** |
| Missing retry logic for transient failures | Potential false negatives | Medium |
| No circuit breaker for repeated failures | Cascade failures | Medium |
| Limited test coverage for edge cases | Regression risk | Medium |

---

## Appendix A: Database Tables

| Table | Purpose |
|-------|---------|
| `products` | Product definitions with constraints metadata |
| `carriers` | Carrier information |
| `premium_matrix` | Rate tables by classification |
| `carrier_condition_acceptance` | Per-carrier condition decisions (v1) |
| `carrier_underwriting_criteria` | AI-extracted underwriting rules |
| `underwriting_health_conditions` | Master list of conditions |
| `underwriting_decision_trees` | Custom admin routing rules |
| `underwriting_sessions` | Saved wizard sessions |
| `underwriting_guides` | Uploaded PDF guides with parsed content |
| `underwriting_rule_sets` | Rule Engine v2 rule sets |
| `underwriting_rules` | Rule Engine v2 individual rules |

---

## Appendix B: Type Definitions

Key types are defined in:
- `src/features/underwriting/types/underwriting.types.ts`
- `src/features/underwriting/types/product-constraints.types.ts`
- `src/services/underwriting/ruleEngineDSL.ts`

---

*Document compiled from comprehensive codebase analysis of commissionTracker UW Wizard feature*
