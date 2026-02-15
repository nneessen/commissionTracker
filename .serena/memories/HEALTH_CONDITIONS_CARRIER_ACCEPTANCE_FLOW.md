# Health Conditions → Carrier Acceptance Flow: COMPLETE TRACE

## EXECUTIVE SUMMARY: YES, CONDITIONS ARE MATCHED

**Answer: YES - Selected health conditions ARE matched against carrier_condition_acceptance rules during recommendations.**

The flow is:
1. User selects condition (e.g., "cancer") in HealthConditionsStep
2. User answers follow-up questions (e.g., "stage", "treatment")
3. Data flows to RecommendationsStep via formData
4. RecommendationsStep → DecisionEngine → QuotingService → **lookupAcceptance()**
5. **lookupAcceptance()** queries `carrier_condition_acceptance` table
6. Results determine carrier eligibility, health class adjustments, and ratings

---

## DETAILED STEP-BY-STEP FLOW

### STEP 1: DATA CAPTURE - HealthConditionsStep.tsx

**File**: `/src/features/underwriting/components/WizardSteps/HealthConditionsStep.tsx`

**What happens:**
- User selects health conditions from a searchable list (diabetes, cancer, heart disease, etc.)
- For each selected condition, follow-up questions appear on the right panel
- Questions are parsed from condition metadata via `parseFollowUpSchema(condition)`
- Responses are stored in `ConditionResponse` objects:

```typescript
{
  conditionCode: string;        // e.g., "cancer"
  conditionName: string;        // e.g., "Cancer"
  responses: {                  // Follow-up answers
    cancer_type?: string;       // e.g., "Breast"
    stage_at_diagnosis?: string;
    diagnosis_date?: string;
    treatment?: string[];       // ["surgery", "chemotherapy"]
    current_status?: string;    // "In remission"
    remission_date?: string;
    [key: string]: unknown;
  };
}
```

**Data Storage:**
- Stored in wizard `formData.health.conditions[]`
- Updated via `onChange` callbacks in the component
- Persisted in React state, NOT sent to DB yet

**Key Code Section (lines 130-168):**
```typescript
const toggleCondition = useCallback(
  (condition: HealthCondition) => {
    const newCondition: ConditionResponse = {
      conditionCode: condition.code,
      conditionName: condition.name,
      responses: {},
    };
    onChange({ conditions: [...data.conditions, newCondition] });
  },
  [...]
);

const updateConditionResponses = useCallback(
  (code: string, responses: Record<string, string | number | string[]>) => {
    const updatedConditions = data.conditions.map((c) =>
      c.conditionCode === code ? { ...c, responses } : c,
    );
    onChange({ conditions: updatedConditions });
  },
  [...]
);
```

---

### STEP 2: TRANSFORM FOLLOW-UP RESPONSES - conditionResponseTransformer.ts

**File**: `/src/services/underwriting/conditionResponseTransformer.ts`

**Purpose:** Convert wizard-style follow-up responses to rule-engine-compatible fact keys.

**What happens:**
When the wizard moves to the Recommendations step, condition responses are transformed:

```typescript
// Input: Raw wizard responses
{
  cancer: {
    cancer_type: "breast",
    stage_at_diagnosis: "Stage II",
    diagnosis_date: "2020-01-15",
    treatment: ["surgery", "chemotherapy"],
    current_status: "in remission",
    remission_date: "2021-06-30"
  }
}

// Output: Rule-engine-compatible facts
{
  cancer: {
    cancer_type: "breast",
    is_high_risk_type: false,
    is_skin_cancer: false,
    years_since_diagnosis: 5.1,  // Calculated from diagnosis_date
    stage: 2,
    is_early_stage: false,
    is_advanced_stage: false,
    had_surgery: true,
    had_chemo: true,
    in_remission: true,
    years_in_remission: 3.6       // Calculated from remission_date
  }
}
```

**Critical Feature (lines 106-130):**
```typescript
export function transformConditionResponses(
  conditions: ConditionResponse[],
  clientAge: number,
): TransformedConditionResponses {
  const result: TransformedConditionResponses = {};

  for (const condition of conditions) {
    const { code, transformed, isRaw } = transformSingleCondition(
      condition.conditionCode,
      condition.responses,
      clientAge,
    );
    result[code] = transformed;
  }

  return result;
}
```

**Key Transformations:**
- Dates → years (e.g., diagnosis_date → years_since_diagnosis)
- Treatment arrays → boolean flags (e.g., surgery → had_surgery)
- Stage strings → numeric values (e.g., "Stage II" → 2)
- Derived fields for rules (e.g., is_advanced_stage = stage >= 3)

**Semantic Rule:**
- Missing source field → undefined (NEVER false, NEVER [])
- Only computed when source exists
- This prevents false negatives in rule matching

---

### STEP 3: PASS TO DECISION ENGINE HOOK - useDecisionEngineRecommendations.ts

**File**: `/src/features/underwriting/hooks/useDecisionEngineRecommendations.ts`

**Purpose:** Bridge wizard data to decision engine via TanStack Query mutation.

**What happens (lines 44-103):**

```typescript
export function transformWizardToDecisionEngineInput(
  clientInfo: ClientInfo,
  healthInfo: HealthInfo,              // ← Contains conditions[]
  coverageRequest: CoverageRequest,
  imoId: string,
  termYears?: number | null,
): DecisionEngineInput {
  // Extract condition codes
  const healthConditions = healthInfo.conditions.map((c) => c.conditionCode);
  // ["cancer", "diabetes"]

  // CRITICAL: Transform follow-up responses to rule-compatible facts
  const conditionResponses = transformConditionResponses(
    healthInfo.conditions,
    clientInfo.age,
  );
  // { cancer: { is_high_risk_type: false, ... }, ... }

  return {
    client: {
      age: clientInfo.age,
      gender,
      state: clientInfo.state,
      bmi,
      tobacco: healthInfo.tobacco.currentUse,
      healthConditions,           // ← Condition codes passed here
      conditionResponses,         // ← Transformed facts passed here
    },
    coverage: { faceAmount, productTypes, ... },
    imoId,
    termYears,
  };
}
```

**The Hook (lines 126-133):**
```typescript
export function useDecisionEngineRecommendations() {
  return useMutation<DecisionEngineResult, Error, DecisionEngineInput>({
    mutationFn: getRecommendations,  // ← Calls decision engine
    onError: (error) => {
      console.error("Decision engine error:", error);
    },
  });
}
```

**Flow in UnderwritingWizard.tsx:**
```typescript
// When user clicks "Next" on HealthConditionsStep → RecommendationsStep:
const decisionInput = transformWizardToDecisionEngineInput(
  formData.client,
  formData.health,                // ← Contains selected conditions + responses
  formData.coverage,
  user?.imo_id!,
);

decisionEngineMutation.mutate(decisionInput);  // ← Triggers decision engine
```

---

### STEP 4: DECISION ENGINE FETCHES PRODUCTS - decisionEngine.ts

**File**: `/src/services/underwriting/decisionEngine.ts`

**Purpose:** Orchestrate product evaluation pipeline.

**What happens (lines 113-200):**

The `getRecommendations()` function:
1. Validates inputs
2. Fetches all available products for the carrier/IMO
3. Fetches extracted criteria, premium matrices, and build charts in parallel
4. Evaluates each product via `evaluateSingleProduct()` with context that includes:
   - `client.healthConditions` (condition codes: ["cancer", "diabetes"])
   - `client.conditionResponses` (transformed facts)
   - `imoId` for tenant isolation

---

### STEP 5: PRODUCT EVALUATION - product-evaluation.ts & quotingService.ts

**File**: `/src/services/underwriting/quotingService.ts`

**Purpose:** Evaluate a single product against client profile.

**Critical Function (lines 238-330): `calculateApproval()`**

This is where **carrier_condition_acceptance is queried**:

```typescript
async function calculateApproval(
  carrierId: string,
  productType: ProductType,
  healthConditions: string[],           // ← Condition codes from wizard
  requestedHealthClass: HealthClass,
  imoId: string,
): Promise<ApprovalResult> {
  const conditionDecisions: ConditionDecision[] = [];
  const concerns: string[] = [];

  // No conditions = healthy client
  if (healthConditions.length === 0) {
    return {
      likelihood: 0.95,
      healthClass: requestedHealthClass,
      conditionDecisions: [],
      concerns: [],
    };
  }

  // *** CRITICAL LOOP: EVALUATE EACH CONDITION ***
  let effectiveHealthClass = requestedHealthClass;
  let adjustedFrom: HealthClass | undefined;

  for (const conditionCode of healthConditions) {
    // *** LOOKUP ACCEPTANCE RULE FROM DATABASE ***
    const acceptance = await lookupAcceptance(
      carrierId,
      conditionCode,              // ← e.g., "cancer"
      imoId,
      productType,
    );
    // ↓ This queries carrier_condition_acceptance table ↓

    if (acceptance) {
      // Rule found - use it to determine approval
      conditionDecisions.push({
        conditionCode,
        decision: acceptance.acceptance as AcceptanceDecision,
        likelihood: acceptance.approval_likelihood ?? 0.5,
        healthClassResult: acceptance.health_class_result,
      });

      // Track concerns
      if (acceptance.acceptance === "declined") {
        concerns.push(`${conditionCode}: declined`);
      } else if (acceptance.acceptance === "case_by_case") {
        concerns.push(`${conditionCode}: requires review`);
      } else if (acceptance.acceptance === "table_rated") {
        concerns.push(`${conditionCode}: table rated`);
      }

      // Apply rating class adjustment
      if (acceptance.health_class_result) {
        const conditionClass = acceptance.health_class_result as HealthClass;
        if (isWorseHealthClass(conditionClass, effectiveHealthClass)) {
          if (!adjustedFrom) {
            adjustedFrom = requestedHealthClass;
          }
          effectiveHealthClass = conditionClass;
        }
      }
    } else {
      // No rule found - assume case_by_case (conservative)
      conditionDecisions.push({
        conditionCode,
        decision: "case_by_case",
        likelihood: 0.5,
        healthClassResult: null,
      });
      concerns.push(`${conditionCode}: no rule found`);
    }
  }

  // If any condition declined, carrier declines entire case
  if (conditionDecisions.some((d) => d.decision === "declined")) {
    return {
      likelihood: 0,
      healthClass: "standard",
      conditionDecisions,
      concerns,
    };
  }

  // Calculate overall likelihood (worst-case)
  const likelihood = Math.min(...conditionDecisions.map((d) => d.likelihood));

  return {
    likelihood,
    healthClass: effectiveHealthClass,
    adjustedFrom,
    conditionDecisions,
    concerns,
  };
}
```

---

### STEP 6: DATABASE LOOKUP - acceptanceService.ts

**File**: `/src/services/underwriting/acceptanceService.ts`

**Purpose:** Query carrier_condition_acceptance table for specific rules.

**Critical Function (lines 185-226): `lookupAcceptance()`**

```typescript
export async function lookupAcceptance(
  carrierId: string,
  conditionCode: string,
  imoId: string,
  productType?: string,
  includeUnapproved: boolean = false,
): Promise<CarrierAcceptance | null> {
  let query = supabase
    .from("carrier_condition_acceptance")
    .select(
      `
      *,
      carrier:carriers(id, name),
      condition:underwriting_health_conditions(code, name, category)
    `,
    )
    .eq("carrier_id", carrierId)
    .eq("condition_code", conditionCode)    // ← Matches condition code
    .eq("imo_id", imoId);

  // Filter by review status - only approved rules (not draft)
  if (!includeUnapproved) {
    query = query.eq("review_status", "approved");
  }

  // Prefer product-specific rules if available
  if (productType) {
    query = query.or(`product_type.eq.${productType},product_type.is.null`);
  }

  const { data, error } = await query
    .order("product_type", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) {
    console.error("Error looking up acceptance:", error);
    throw new Error(`Failed to lookup acceptance: ${error.message}`);
  }

  return (data && data.length > 0 ? data[0] : null) as CarrierAcceptance | null;
}
```

**Query Logic:**
- Searches `carrier_condition_acceptance` table
- Matches on: carrier_id, condition_code, imo_id, review_status="approved"
- Returns single row with acceptance decision
- Returns null if no matching rule found

**Returned Data Structure:**
```typescript
CarrierAcceptance = {
  id: string;
  carrier_id: string;
  condition_code: string;           // e.g., "cancer"
  acceptance: "approved" | "table_rated" | "case_by_case" | "declined";
  health_class_result?: string;     // e.g., "table_a" (adjustment)
  approval_likelihood?: number;     // 0-1, confidence in approval
  notes?: string;
  review_status: "approved" | "draft" | "pending_review" | "rejected";
}
```

---

### STEP 7: RESULTS DISPLAYED - RecommendationsStep.tsx

**File**: `/src/features/underwriting/components/WizardSteps/RecommendationsStep.tsx`

**Purpose:** Display final recommendations with condition analysis.

**What happens:**
1. RecommendationsStep receives `decisionEngineResult` from mutation
2. For each recommended product, displays:
   - Carrier/product name
   - Health class assignment
   - Approval likelihood
   - **Condition decisions table** (lines 1447-1477)
   - Concerns and risk factors

**Condition Display Section (lines 1447-1477):**
```typescript
{/* Condition Decisions (if any) */}
{recommendation.conditionDecisions.length > 0 && (
  <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
    <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
      Condition Analysis
    </div>
    <div className="space-y-1">
      {recommendation.conditionDecisions.map((cd, i) => (
        <div
          key={i}
          className="flex items-center justify-between text-[10px]"
        >
          <span className="text-zinc-600 dark:text-zinc-400">
            {cd.conditionCode}  {/* ← e.g., "cancer" */}
          </span>
          <span
            className={cn(
              cd.decision === "approved"
                ? "text-emerald-600 dark:text-emerald-400"
                : cd.decision === "declined"
                  ? "text-red-600 dark:text-red-400"
                  : "text-yellow-600 dark:text-yellow-400",
            )}
          >
            {cd.decision} ({cd.likelihood}%)  {/* ← Decision from DB! */}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

---

## DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│ HealthConditionsStep                                             │
│ User selects: "cancer", answers follow-ups (stage, treatment)  │
│ → formData.health.conditions = [                                 │
│     { conditionCode: "cancer", responses: { ... } }             │
│   ]                                                              │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ transformConditionResponses (conditionResponseTransformer.ts)   │
│ Convert wizard responses → rule-engine facts                     │
│ { cancer_type, stage, had_chemo, in_remission, ... }           │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ transformWizardToDecisionEngineInput                             │
│ Build DecisionEngineInput with:                                  │
│  - client.healthConditions = ["cancer"]                          │
│  - client.conditionResponses = { cancer: {...} }               │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ useDecisionEngineRecommendations.mutate(input)                  │
│ TanStack Query mutation triggers async server call              │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ decisionEngine.getRecommendations(input)                         │
│ 1. Fetch products for IMO/carrier                               │
│ 2. Evaluate each product in parallel                            │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ FOR EACH PRODUCT:                                               │
│ evaluateSingleProduct(product, evaluationContext)              │
│  - Pass: client.healthConditions, client.conditionResponses   │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ quotingService.calculateApproval()                               │
│ FOR EACH CONDITION CODE:                                        │
│   lookupAcceptance(carrierId, "cancer", imoId, productType)    │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ *** DATABASE QUERY ***                                          │
│ SELECT * FROM carrier_condition_acceptance                      │
│ WHERE carrier_id = ?                                            │
│   AND condition_code = "cancer"                                 │
│   AND imo_id = ?                                               │
│   AND review_status = "approved"                               │
│ LIMIT 1                                                         │
│                                                                 │
│ RESULT:                                                         │
│ {                                                               │
│   acceptance: "approved" | "declined" | "table_rated"          │
│   health_class_result: "preferred" | "table_a" | null         │
│   approval_likelihood: 0.85                                    │
│ }                                                               │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Return conditionDecisions[]:                                    │
│ [                                                               │
│   {                                                             │
│     conditionCode: "cancer",                                   │
│     decision: "approved",    // ← FROM DATABASE!               │
│     likelihood: 85,          // ← FROM DATABASE!               │
│     healthClassResult: null                                    │
│   }                                                             │
│ ]                                                               │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ DecisionEngineResult returned to UI                             │
│ recommendation.conditionDecisions = [{ ... }]                   │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ RecommendationsStep displays results                            │
│ Shows condition analysis with decision, likelihood, reasons    │
└─────────────────────────────────────────────────────────────────┘
```

---

## KEY FINDINGS

### 1. **CONDITIONS ARE MATCHED** ✓
- Selected condition codes flow from HealthConditionsStep → DecisionEngine → QuotingService
- `lookupAcceptance()` explicitly queries `carrier_condition_acceptance` table
- Database rules DIRECTLY affect recommendation outcomes

### 2. **CONDITIONS ARE QUERIED PER CARRIER PER PRODUCT**
- `lookupAcceptance()` called once per condition per carrier/product combo
- Filtering: `review_status = "approved"` (only published rules)
- Product-specific rules preferred over generic rules

### 3. **MATCH LOGIC IS STRICT**
- Condition code must exactly match (e.g., "cancer" not "CANCER")
- IMO ID must match (tenant isolation)
- Carrier ID must match
- No condition matching → "case_by_case" (conservative default)

### 4. **DECISIONS AFFECT OUTCOMES**
If `carrier_condition_acceptance` returns:
- `acceptance: "declined"` → Entire case declined (likelihood = 0)
- `acceptance: "table_rated"` → Health class adjusted, concern noted
- `acceptance: "case_by_case"` → Flagged for underwriter review
- `health_class_result: "table_a"` → Rating adjusted (client may be rated up)
- `approval_likelihood: 0.5` → Used to calculate overall approval

### 5. **FLOW IS SYNCHRONOUS AND SEQUENTIAL**
- User enters health data → Immediately available for decision engine
- Decision engine waits for all product evaluations to complete
- Results returned when all carrier_condition_acceptance lookups done
- UI displays final recommendations with condition decisions embedded

### 6. **FOLLOW-UP RESPONSES ARE TRANSFORMED BUT NOT STORED IN ACCEPTANCE**
- Responses (cancer stage, treatment, etc.) transform to facts for rule evaluation
- Facts are NOT sent to acceptance service - only condition code is matched
- Acceptance rules are binary per condition code (not condition-specific details)
- BUT: Rule engine v2 (if enabled) can use transformed facts in compound predicates

### 7. **DRAFT RULES DO NOT AFFECT RECOMMENDATIONS**
- Only `review_status = "approved"` rules are used
- Draft/pending rules visible in "Draft Rules (FYI Only)" section
- AI-extracted rules start as draft, must be manually approved

---

## IMPORTANT CAVEATS

1. **Condition Code Must Exist:**
   - If user selects a condition not in `underwriting_health_conditions`, recommendation will treat it as "no rule found"

2. **IMO ID Critical:**
   - All lookups filtered by IMO ID
   - Each IMO has separate carrier_condition_acceptance rules
   - Wrong IMO ID = no rules found

3. **Rule Status Matters:**
   - Only "approved" rules affect recommendations
   - Draft rules visible but don't affect scoring
   - Rejected rules ignored

4. **No Rule = Conservative Default:**
   - If no `carrier_condition_acceptance` row found, decision = "case_by_case"
   - Treated as requiring underwriter review
   - Not auto-declined (conservative approach)

5. **Transformed Facts vs. Acceptance Rules:**
   - Condition follow-ups transform to facts (insulin_use, years_since_diagnosis, etc.)
   - These facts are passed to decision engine for rule v2 evaluation
   - But simple acceptance lookups only use condition code
   - More detailed evaluation happens via rule engine v2, not acceptance table

---

## CODE REFERENCES

| Component | File | Key Function |
|-----------|------|--------------|
| User Input | HealthConditionsStep.tsx | toggleCondition(), updateConditionResponses() |
| Transform | conditionResponseTransformer.ts | transformConditionResponses() |
| Hook | useDecisionEngineRecommendations.ts | transformWizardToDecisionEngineInput() |
| Engine | decisionEngine.ts | getRecommendations() |
| Evaluation | quotingService.ts | calculateApproval() |
| Database | acceptanceService.ts | **lookupAcceptance()** ← KEY QUERY |
| Display | RecommendationsStep.tsx | ConditionDecision rendering (lines 1447-1477) |

---

## EXAMPLE SCENARIO

**User selects cancer:**
1. HealthConditionsStep: conditionCode = "cancer", responses = { stage_at_diagnosis: "Stage II", current_status: "in remission" }
2. Transform: cancer.stage = 2, cancer.in_remission = true
3. DecisionEngine: healthConditions = ["cancer"]
4. QuotingService loop: For each carrier/product, calls:
   ```typescript
   lookupAcceptance("carrier-123", "cancer", imoId, "term_life")
   ```
5. Database returns:
   ```typescript
   { acceptance: "approved", health_class_result: "standard", approval_likelihood: 0.80 }
   ```
6. Result: Carrier approves cancer, but at Standard (not Preferred)
7. UI displays: "cancer: approved (80%)"

If no rule found:
- Result: "cancer: case_by_case (50%)"
- Recommendation includes concern: "cancer: no rule found"
- User sees it requires underwriter review
