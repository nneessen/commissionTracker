# Phase 5: Criteria-Driven Decision Engine

**Status:** Ready for Implementation
**Priority:** High
**Depends On:** Phase 4 (Human Review UI) - Completed

---

## 1. Problem Restatement

### Goal
Integrate AI-extracted and human-approved underwriting criteria from `carrier_underwriting_criteria` into the underwriting wizard's decision engine, enabling deterministic rule-based filtering and informed AI recommendations.

### Current State
- Phase 4 implemented: Criteria extraction, storage, and human review workflow
- `carrier_underwriting_criteria` table contains structured criteria (age limits, knockout conditions, build requirements, etc.)
- Criteria can be approved and marked as `is_active = true`
- **Gap:** The `underwriting-ai-analyze` Edge Function does not query or use this structured criteria
- **Gap:** Product eligibility uses only `products.metadata` constraints, not carrier-specific extracted criteria
- **Gap:** AI context uses raw guide text excerpts, not structured criteria summaries

### Constraints
- Must maintain backward compatibility (work without criteria for carriers that haven't been extracted)
- Must not increase AI token usage significantly (structured criteria is more efficient than raw text)
- Must preserve existing decision tree integration
- Must handle missing/partial criteria gracefully
- Performance: Criteria lookup should add <50ms to request time

### Unknowns to Resolve
- How to merge criteria-based filtering with existing product metadata constraints (criteria takes precedence, or union?)
- Whether to apply criteria filtering BEFORE or IN ADDITION TO decision tree routing
- How to handle multiple active criteria sets per carrier (e.g., different products)

---

## 2. High-Level Architecture

### Frontend Responsibilities
- No changes required to wizard flow
- Optionally: Display which criteria rules matched in recommendations (future enhancement)

### Backend Responsibilities (Edge Function)
- Fetch active criteria for eligible carriers
- Apply deterministic criteria rules BEFORE AI call
- Include structured criteria summary in AI context (replacing/augmenting raw excerpts)
- Track which criteria rules filtered products
- Return criteria match metadata in response

### Data Ownership
- `carrier_underwriting_criteria` owned by IMO (RLS enforced)
- Criteria linked to carrier via `carrier_id`, optionally to product via `product_id`
- Source of truth: Active criteria (`is_active = true`) per carrier/product

### Auth Boundaries
- Edge function uses service role (bypasses RLS for read)
- Frontend RLS controls who can create/approve criteria
- Analysis endpoint remains publicly accessible via valid auth token

### Trust Model
- Criteria is trusted after human approval
- AI recommendations are advisory; criteria rules are deterministic
- Conflicts: Criteria rules take precedence over AI suggestions

---

## 3. Data Model & Schema Changes

### No New Tables Required
The `carrier_underwriting_criteria` table already has the required structure.

### Existing Schema (Reference)
```sql
carrier_underwriting_criteria (
  id UUID PRIMARY KEY,
  imo_id UUID NOT NULL REFERENCES imos(id),
  carrier_id UUID NOT NULL REFERENCES carriers(id),
  guide_id UUID REFERENCES underwriting_guides(id),
  product_id UUID REFERENCES products(id), -- NULL = carrier-wide

  extraction_status VARCHAR(20),
  review_status VARCHAR(20),
  is_active BOOLEAN DEFAULT FALSE,

  criteria JSONB NOT NULL DEFAULT '{}',
  -- Schema: { ageLimits, faceAmountLimits, knockoutConditions,
  --           buildRequirements, tobaccoRules, medicationRestrictions,
  --           stateAvailability }

  source_excerpts JSONB DEFAULT '[]',
  ...
)
```

### Migration Required: Add Index for Active Criteria Lookup
```sql
-- Optimize criteria lookup by carrier for active criteria
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_criteria_active_carrier
  ON carrier_underwriting_criteria(carrier_id, is_active)
  WHERE is_active = TRUE;
```

### RLS Impact
- Edge function uses service role key
- No RLS changes needed

---

## 4. API & Data Flow Design

### Modified Endpoint: `underwriting-ai-analyze`

#### New Data Flow
```
Request → Validate → Fetch Carriers → Fetch Active Criteria →
Apply Criteria Filters → Evaluate Decision Tree → Build AI Context →
Call Claude → Merge Results → Return with Criteria Matches
```

#### New Input (No Change)
Existing `AnalysisRequest` is sufficient.

#### New Processing Steps

**Step 1: Fetch Active Criteria**
```typescript
// After fetching eligible carriers, fetch criteria for those carriers
const activeCriteria = await supabase
  .from('carrier_underwriting_criteria')
  .select('carrier_id, product_id, criteria')
  .eq('imo_id', imoId)
  .eq('is_active', true)
  .in('carrier_id', carrierIds);
```

**Step 2: Apply Criteria-Based Filtering**
New helper functions:
- `applyCriteriaAgeLimits(criteria, clientAge)` → boolean
- `applyCriteriaFaceAmountLimits(criteria, clientAge, faceAmount)` → boolean
- `applyCriteriaKnockouts(criteria, clientConditions)` → string | null
- `applyCriteriaTobaccoRules(criteria, tobaccoInfo)` → string | null
- `applyCriteriaStateAvailability(criteria, clientState)` → boolean
- `applyCriteriaBuildRequirements(criteria, clientBmi)` → 'pass' | 'table_rated' | 'decline'

**Step 3: Enhanced AI Context**
Replace raw guide excerpts with structured criteria summary:
```typescript
// Instead of parsing guide sections, provide structured summary
const criteriaContext = buildCriteriaContext(criteria);
// Example output:
// "Carrier X Criteria:
//  - Age: 18-80
//  - Max face for age 65+: $500,000
//  - Knockout conditions: HIV, ALS, Organ transplant
//  - Tobacco: Must be 12mo clean for non-smoker
//  - State: Not available in NY"
```

#### New Output Fields
```typescript
interface EnhancedAnalysisResponse {
  success: boolean;
  analysis: { ... }; // Existing
  filteredProducts: { ... }[]; // Existing
  criteriaFilters: {
    applied: boolean;
    matchedCarriers: string[];
    filteredByCarrier: {
      carrierId: string;
      carrierName: string;
      productId?: string;
      productName?: string;
      rule: string;
      reason: string;
    }[];
    criteriaVersion: number;
  };
  treeEvaluation: { ... }; // Existing
}
```

#### Error Handling
- Missing criteria for carrier: Fall back to product metadata + AI analysis
- Invalid criteria JSON: Log warning, skip that criteria set
- All carriers filtered by criteria: Return empty recommendations with explanation

---

## 5. Frontend Integration Plan

### Phase 5.1: No UI Changes (Backend Only)
The initial implementation requires no frontend changes. The wizard will work exactly as before, but with more accurate filtering.

### Phase 5.2 (Future): Display Criteria Matches
Optional enhancement to show which criteria informed recommendations:
- Add "Criteria Match" indicator on recommendation cards
- Show criteria-based filtering reasons for ineligible products
- Link to carrier criteria details

### Query/Cache Strategy
No new queries needed. Existing `useUnderwritingAnalysis` mutation returns the enhanced response. The `criteriaFilters` field can be used for future UI enhancements.

### Loading/Error/Empty States
- **Criteria not available:** Silent fallback to existing behavior
- **All filtered by criteria:** Show "No carriers meet criteria" with reasons
- **Partial criteria:** Show recommendations with note about limited criteria data

---

## 6. Implementation Steps

### Step 1: Add Database Index
**File:** `supabase/migrations/20260110_012_criteria_decision_index.sql`
```sql
-- Index for efficient active criteria lookup by carrier
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_criteria_active_carrier
  ON carrier_underwriting_criteria(carrier_id, is_active)
  WHERE is_active = TRUE;

COMMENT ON INDEX idx_criteria_active_carrier IS
  'Optimizes active criteria lookup for underwriting analysis';
```

### Step 2: Create Criteria Evaluator Module
**File:** `supabase/functions/underwriting-ai-analyze/criteria-evaluator.ts`

```typescript
// Types
export interface ExtractedCriteria {
  ageLimits?: { minIssueAge: number; maxIssueAge: number };
  faceAmountLimits?: {
    minimum: number;
    maximum: number;
    ageTiers?: { minAge: number; maxAge: number; maxFaceAmount: number }[];
  };
  knockoutConditions?: { conditionCodes: string[]; descriptions: {...}[] };
  buildRequirements?: { type: string; preferredBmiMax?: number; standardBmiMax?: number };
  tobaccoRules?: { smokingClassifications: {...}[]; nicotineTestRequired: boolean };
  medicationRestrictions?: { insulin?: {...}; bloodThinners?: {...}; opioids?: {...} };
  stateAvailability?: { availableStates: string[]; unavailableStates: string[] };
}

export interface CriteriaEvaluationResult {
  eligible: boolean;
  reasons: string[];
  buildRating?: 'preferred' | 'standard' | 'table_rated' | 'decline';
  tobaccoClass?: string;
}

export interface CriteriaFilteredProduct {
  carrierId: string;
  carrierName: string;
  productId?: string;
  productName?: string;
  rule: string;
  reason: string;
}

// Main evaluator function
export function evaluateCriteria(
  criteria: ExtractedCriteria,
  client: { age: number; state: string; bmi: number },
  health: { conditions: { code: string }[]; tobacco: { currentUse: boolean; lastUseDate?: string } },
  coverage: { faceAmount: number }
): CriteriaEvaluationResult {
  const reasons: string[] = [];
  let eligible = true;

  // Age limits
  if (criteria.ageLimits) {
    if (client.age < criteria.ageLimits.minIssueAge) {
      reasons.push(`Age ${client.age} below minimum ${criteria.ageLimits.minIssueAge}`);
      eligible = false;
    }
    if (client.age > criteria.ageLimits.maxIssueAge) {
      reasons.push(`Age ${client.age} above maximum ${criteria.ageLimits.maxIssueAge}`);
      eligible = false;
    }
  }

  // Face amount with age tiers
  if (criteria.faceAmountLimits) {
    const { minimum, maximum, ageTiers } = criteria.faceAmountLimits;
    if (coverage.faceAmount < minimum) {
      reasons.push(`Face amount $${coverage.faceAmount} below minimum $${minimum}`);
      eligible = false;
    }

    // Check age-tiered maximum
    let applicableMax = maximum;
    if (ageTiers) {
      const tier = ageTiers.find(t => client.age >= t.minAge && client.age <= t.maxAge);
      if (tier) applicableMax = Math.min(applicableMax, tier.maxFaceAmount);
    }
    if (coverage.faceAmount > applicableMax) {
      reasons.push(`Face amount $${coverage.faceAmount} exceeds age-tier max $${applicableMax}`);
      eligible = false;
    }
  }

  // Knockout conditions
  if (criteria.knockoutConditions?.conditionCodes) {
    const clientCodes = health.conditions.map(c => c.code);
    const knockout = clientCodes.find(c =>
      criteria.knockoutConditions!.conditionCodes.includes(c)
    );
    if (knockout) {
      reasons.push(`Knockout condition: ${knockout}`);
      eligible = false;
    }
  }

  // State availability
  if (criteria.stateAvailability) {
    const { availableStates, unavailableStates } = criteria.stateAvailability;
    if (unavailableStates?.includes(client.state)) {
      reasons.push(`Not available in state: ${client.state}`);
      eligible = false;
    }
    if (availableStates?.length > 0 && !availableStates.includes(client.state)) {
      reasons.push(`Not available in state: ${client.state}`);
      eligible = false;
    }
  }

  // Build requirements (affects rating, not eligibility)
  let buildRating: CriteriaEvaluationResult['buildRating'] = undefined;
  if (criteria.buildRequirements && criteria.buildRequirements.type === 'bmi') {
    const { preferredBmiMax, standardBmiMax } = criteria.buildRequirements;
    if (standardBmiMax && client.bmi > standardBmiMax) {
      buildRating = 'table_rated';
      reasons.push(`BMI ${client.bmi} exceeds standard max ${standardBmiMax}`);
    } else if (preferredBmiMax && client.bmi > preferredBmiMax) {
      buildRating = 'standard';
    } else {
      buildRating = 'preferred';
    }
  }

  // Tobacco rules (affects classification)
  let tobaccoClass: string | undefined;
  if (criteria.tobaccoRules?.smokingClassifications && health.tobacco) {
    if (health.tobacco.currentUse) {
      tobaccoClass = 'smoker';
    } else {
      // Check clean months requirement
      const classifications = criteria.tobaccoRules.smokingClassifications;
      const cleanMonths = health.tobacco.lastUseDate
        ? monthsSince(health.tobacco.lastUseDate)
        : 999;

      const matchedClass = classifications.find(c => cleanMonths >= c.requiresCleanMonths);
      tobaccoClass = matchedClass?.classification || 'smoker';
    }
  }

  return { eligible, reasons, buildRating, tobaccoClass };
}

function monthsSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 +
         (now.getMonth() - date.getMonth());
}

// Build structured context for AI prompt
export function buildCriteriaContext(
  criteriaByCarrier: Map<string, { carrierName: string; criteria: ExtractedCriteria }>
): string {
  const entries: string[] = [];

  for (const [carrierId, { carrierName, criteria }] of criteriaByCarrier) {
    const lines: string[] = [`### ${carrierName} Underwriting Criteria:`];

    if (criteria.ageLimits) {
      lines.push(`- Age: ${criteria.ageLimits.minIssueAge}-${criteria.ageLimits.maxIssueAge}`);
    }

    if (criteria.faceAmountLimits) {
      const { minimum, maximum, ageTiers } = criteria.faceAmountLimits;
      lines.push(`- Face Amount: $${minimum.toLocaleString()}-$${maximum.toLocaleString()}`);
      if (ageTiers?.length) {
        lines.push(`  Age-tiered limits:`);
        ageTiers.forEach(t => {
          lines.push(`    - Ages ${t.minAge}-${t.maxAge}: max $${t.maxFaceAmount.toLocaleString()}`);
        });
      }
    }

    if (criteria.knockoutConditions?.conditionCodes?.length) {
      lines.push(`- Knockout Conditions: ${criteria.knockoutConditions.conditionCodes.join(', ')}`);
    }

    if (criteria.tobaccoRules) {
      const rules = criteria.tobaccoRules.smokingClassifications
        .map(c => `${c.classification}: ${c.requiresCleanMonths}mo clean`)
        .join(', ');
      lines.push(`- Tobacco: ${rules}`);
    }

    if (criteria.stateAvailability?.unavailableStates?.length) {
      lines.push(`- Unavailable States: ${criteria.stateAvailability.unavailableStates.join(', ')}`);
    }

    entries.push(lines.join('\n'));
  }

  return entries.join('\n\n');
}
```

### Step 3: Integrate Criteria Evaluator into Edge Function
**File:** `supabase/functions/underwriting-ai-analyze/index.ts`

**Changes:**
1. Import new module
2. Add criteria fetch after carrier fetch
3. Apply criteria filtering before AI call
4. Replace/augment guide excerpts with criteria context
5. Return criteria filter metadata in response

```typescript
// Add import at top
import {
  evaluateCriteria,
  buildCriteriaContext,
  type ExtractedCriteria,
  type CriteriaFilteredProduct
} from "./criteria-evaluator.ts";

// After fetching carriers and before filtering (around line 180):

// Fetch active criteria for carriers
const criteriaByCarrier = new Map<string, {
  carrierName: string;
  criteria: ExtractedCriteria;
  productId?: string;
}>();

if (imoId && eligibleCarriers.length > 0) {
  const carrierIds = eligibleCarriers.map(c => c.id);
  const { data: activeCriteria } = await supabase
    .from('carrier_underwriting_criteria')
    .select('carrier_id, product_id, criteria')
    .eq('imo_id', imoId)
    .eq('is_active', true)
    .in('carrier_id', carrierIds);

  if (activeCriteria) {
    for (const c of activeCriteria) {
      const carrier = eligibleCarriers.find(car => car.id === c.carrier_id);
      if (carrier && c.criteria) {
        criteriaByCarrier.set(c.carrier_id, {
          carrierName: carrier.name,
          criteria: c.criteria as ExtractedCriteria,
          productId: c.product_id
        });
      }
    }
  }
  console.log(`[underwriting-ai] Found ${criteriaByCarrier.size} active criteria sets`);
}

// Apply criteria-based filtering (after existing product filtering, around line 320):
const criteriaFilteredProducts: CriteriaFilteredProduct[] = [];

if (criteriaByCarrier.size > 0) {
  for (const carrier of eligibleCarriers) {
    const carrierCriteria = criteriaByCarrier.get(carrier.id);
    if (!carrierCriteria) continue; // No criteria, skip evaluation

    const result = evaluateCriteria(
      carrierCriteria.criteria,
      { age: client.age, state: client.state, bmi: client.bmi },
      { conditions: health.conditions, tobacco: health.tobacco },
      { faceAmount: coverage.faceAmount }
    );

    if (!result.eligible) {
      // Remove carrier's products from eligible list
      carrier.products = [];
      for (const reason of result.reasons) {
        criteriaFilteredProducts.push({
          carrierId: carrier.id,
          carrierName: carrier.name,
          rule: 'criteria',
          reason
        });
      }
    }
  }

  // Re-filter to remove empty carriers
  eligibleCarriers = eligibleCarriers.filter(c => c.products.length > 0);
}

// Modify system prompt building (around line 590):
// Replace guide excerpts with structured criteria context
let criteriaSection = "";
if (criteriaByCarrier.size > 0) {
  criteriaSection = `
CARRIER-SPECIFIC UNDERWRITING CRITERIA (Pre-validated):
The following criteria have been extracted from carrier guides and verified.
Use these rules to inform your recommendations:

${buildCriteriaContext(criteriaByCarrier)}

IMPORTANT: Carriers with criteria above have been pre-filtered for eligibility.
Only recommend products from carriers that passed criteria checks.
`;
}

// In response (around line 546), add criteria metadata:
return new Response(
  JSON.stringify({
    success: true,
    analysis: analysisResult,
    filteredProducts: filteredOutProducts,
    criteriaFilters: {
      applied: criteriaByCarrier.size > 0,
      matchedCarriers: Array.from(criteriaByCarrier.keys()),
      filteredByCarrier: criteriaFilteredProducts,
    },
    fullUnderwritingRequired: productsRequiringFullUW,
    treeEvaluation: /* existing */,
  }),
  // ...
);
```

### Step 4: Update TypeScript Types
**File:** `src/features/underwriting/types/underwriting.types.ts`

Add response type for criteria filters:
```typescript
export interface CriteriaFilterResult {
  applied: boolean;
  matchedCarriers: string[];
  filteredByCarrier: {
    carrierId: string;
    carrierName: string;
    productId?: string;
    productName?: string;
    rule: string;
    reason: string;
  }[];
}

// Update AIAnalysisResult
export interface AIAnalysisResult {
  healthTier: HealthTier;
  riskFactors: string[];
  recommendations: CarrierRecommendation[];
  reasoning: string;
  processingTimeMs: number;
  criteriaFilters?: CriteriaFilterResult; // New
}
```

### Step 5: Update Hook to Handle New Response Fields
**File:** `src/features/underwriting/hooks/useUnderwritingAnalysis.ts`

```typescript
// Update result mapping to include criteria filters
const result: AIAnalysisResult = {
  // ... existing fields
  criteriaFilters: data.criteriaFilters ? {
    applied: data.criteriaFilters.applied,
    matchedCarriers: data.criteriaFilters.matchedCarriers || [],
    filteredByCarrier: data.criteriaFilters.filteredByCarrier || [],
  } : undefined,
};
```

### Step 6: Apply Migration and Regenerate Types
```bash
./scripts/apply-migration.sh supabase/migrations/20260110_012_criteria_decision_index.sql
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
npm run typecheck
npm run build
```

---

## 7. Test Plan

### Unit Tests: Criteria Evaluator
**File:** `supabase/functions/underwriting-ai-analyze/criteria-evaluator.test.ts`

```typescript
describe('evaluateCriteria', () => {
  describe('age limits', () => {
    it('rejects client below minimum age', () => {
      const result = evaluateCriteria(
        { ageLimits: { minIssueAge: 18, maxIssueAge: 80 } },
        { age: 16, state: 'TX', bmi: 25 },
        { conditions: [], tobacco: { currentUse: false } },
        { faceAmount: 100000 }
      );
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Age 16 below minimum 18');
    });

    it('accepts client within age range', () => {
      const result = evaluateCriteria(
        { ageLimits: { minIssueAge: 18, maxIssueAge: 80 } },
        { age: 45, state: 'TX', bmi: 25 },
        { conditions: [], tobacco: { currentUse: false } },
        { faceAmount: 100000 }
      );
      expect(result.eligible).toBe(true);
    });
  });

  describe('knockout conditions', () => {
    it('rejects client with knockout condition', () => {
      const result = evaluateCriteria(
        { knockoutConditions: { conditionCodes: ['HIV', 'ALS'], descriptions: [] } },
        { age: 45, state: 'TX', bmi: 25 },
        { conditions: [{ code: 'HIV' }], tobacco: { currentUse: false } },
        { faceAmount: 100000 }
      );
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Knockout condition: HIV');
    });
  });

  describe('face amount tiers', () => {
    it('applies age-tiered maximum', () => {
      const result = evaluateCriteria(
        {
          faceAmountLimits: {
            minimum: 25000,
            maximum: 1000000,
            ageTiers: [
              { minAge: 65, maxAge: 80, maxFaceAmount: 250000 }
            ]
          }
        },
        { age: 70, state: 'TX', bmi: 25 },
        { conditions: [], tobacco: { currentUse: false } },
        { faceAmount: 500000 }
      );
      expect(result.eligible).toBe(false);
      expect(result.reasons[0]).toContain('exceeds age-tier max $250,000');
    });
  });

  describe('state availability', () => {
    it('rejects unavailable state', () => {
      const result = evaluateCriteria(
        { stateAvailability: { availableStates: [], unavailableStates: ['NY', 'CA'] } },
        { age: 45, state: 'NY', bmi: 25 },
        { conditions: [], tobacco: { currentUse: false } },
        { faceAmount: 100000 }
      );
      expect(result.eligible).toBe(false);
    });
  });
});
```

### Integration Tests
- Test wizard flow with carrier that has active criteria
- Test wizard flow with carrier without criteria (fallback behavior)
- Test partial criteria (some fields missing)
- Test conflicting criteria and product metadata

### Security Tests
- Verify criteria from other IMOs cannot be accessed
- Verify service role is required for Edge Function read
- Test with malformed criteria JSON

---

## 8. Risk & Failure Analysis

### Data Corruption Risks
- **Risk:** Invalid criteria JSON stored in database
- **Mitigation:** Zod validation on save (implemented in Phase 4)

### Security Risks
- **Risk:** Cross-IMO criteria leakage
- **Mitigation:** Service role query explicitly filters by imoId

### Race Conditions
- **Risk:** Criteria approved while analysis in progress
- **Mitigation:** Acceptable - analysis uses snapshot at query time

### Performance Risks
- **Risk:** Additional DB query adds latency
- **Mitigation:** Single indexed query, expect <20ms

### Rollback Strategy
1. Remove criteria evaluation code from Edge Function
2. Deploy Edge Function without criteria integration
3. No data changes required (criteria table unchanged)

---

## 9. Final Implementation Checklist

### Database
- [ ] Create migration `20260110_012_criteria_decision_index.sql`
- [ ] Apply migration
- [ ] Verify index created

### Edge Function
- [ ] Create `criteria-evaluator.ts` module
- [ ] Add unit tests for criteria evaluator
- [ ] Integrate criteria fetch into `index.ts`
- [ ] Apply criteria filtering before AI call
- [ ] Build criteria context for AI prompt
- [ ] Add criteria metadata to response
- [ ] Deploy Edge Function

### Frontend
- [ ] Update `AIAnalysisResult` type with criteriaFilters
- [ ] Update `useUnderwritingAnalysis` to map new fields
- [ ] Verify existing wizard flow works unchanged

### Testing
- [ ] Run criteria evaluator unit tests
- [ ] Manual test: Wizard with carrier WITH active criteria
- [ ] Manual test: Wizard with carrier WITHOUT criteria
- [ ] Manual test: Verify knockout condition filtering works
- [ ] Manual test: Verify age tier filtering works

### Verification
- [ ] Run `npm run typecheck` - zero errors
- [ ] Run `npm run build` - success
- [ ] Run `npm run test:run` - all pass

---

## 10. Implementation Notes

### Decision: Criteria vs Product Metadata
**Chosen Approach:** Criteria takes precedence when available. Product metadata is fallback.

Rationale:
- Extracted criteria is carrier-specific and more accurate
- Product metadata is generic defaults
- Allows gradual migration as more guides are processed

### Decision: Criteria Context in AI Prompt
**Chosen Approach:** Structured criteria summary REPLACES raw guide excerpts when criteria is available.

Rationale:
- Structured criteria is more token-efficient
- Deterministic filtering already applied, AI doesn't need to re-evaluate
- AI can focus on risk assessment rather than rule interpretation

### Future Enhancements (Out of Scope for Phase 5)
- Show criteria match details in recommendation UI
- Allow user to see why a carrier was filtered
- Criteria versioning and audit trail
- Product-specific criteria (currently carrier-wide)

---

## Commands to Begin

```bash
# Create migration
touch supabase/migrations/20260110_012_criteria_decision_index.sql

# Create criteria evaluator module
touch supabase/functions/underwriting-ai-analyze/criteria-evaluator.ts

# After implementation:
./scripts/apply-migration.sh supabase/migrations/20260110_012_criteria_decision_index.sql
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
npm run typecheck
npm run build
```
