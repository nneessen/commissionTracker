# Carrier Acceptance Rules v2 — Redesign Specification

## Executive Summary

**Problem**: Current knockout rules are carrier-global, but underwriting outcomes differ significantly by product type. A condition that's a hard decline on Term Life might be a Table C rating on Whole Life.

**Solution**: Introduce product-type scoping, split knockouts into "absolute" vs "conditional" categories, and clearly label all generated rules as templates requiring review.

---

## 1. Product Decision Model

### Hierarchy (Most to Least Specific)

```
┌─────────────────────────────────────────────────────────────┐
│ Level 1: Product-Specific (product_id = specific UUID)      │
│   - Highest priority, overrides everything below            │
│   - Used for product-specific age limits, rider rules       │
├─────────────────────────────────────────────────────────────┤
│ Level 2: Product-Type (product_type = 'term'|'whole_life')  │
│   - Applies to all products of that type for carrier        │
│   - Used for type-specific underwriting (term vs whole)     │
├─────────────────────────────────────────────────────────────┤
│ Level 3: Carrier-Global (product_type = NULL, product_id = NULL) │
│   - Lowest priority, applies to all products                │
│   - Used for TRUE universal knockouts only                  │
└─────────────────────────────────────────────────────────────┘
```

### Product Types (Enum)

```sql
CREATE TYPE product_type AS ENUM (
  'term_life',
  'whole_life',
  'universal_life',
  'final_expense',
  'indexed_universal_life',
  'variable_life'
);
```

### Minimal Viable Model

- **Don't** create rules for every product × condition combination
- **Do** use product_type to cover 80% of cases
- **Do** allow product_id overrides for edge cases
- **Do** keep truly universal knockouts at carrier level

---

## 2. Knockout Decision: Split Into Categories

### Recommendation: Option C (Split "Absolute" vs "Conditional")

#### Category A: Absolute Knockouts (Carrier-Global)
These conditions result in decline across ALL product types at virtually ALL carriers:

| Code | Name | Rationale |
|------|------|-----------|
| `aids_hiv` | AIDS/HIV | Universal mortality risk |
| `als` | ALS | Terminal, no exceptions |
| `alzheimers` | Alzheimer's Disease | Cognitive impairment, terminal |
| `dementia` | Dementia | Cognitive impairment |
| `hospice` | Hospice Care | Terminal by definition |
| `metastatic_cancer` | Active Metastatic Cancer | Terminal |
| `organ_transplant_waiting` | Awaiting Organ Transplant | Pre-surgical mortality risk |

**Generated as**: `scope = 'condition'`, `product_type = NULL` (carrier-global)
**Outcome**: `ineligible` / `decline`

#### Category B: Conditional Knockouts (Product-Type Scoped)
These conditions have different outcomes by product type:

| Code | Term Life | Whole Life | Final Expense |
|------|-----------|------------|---------------|
| `dialysis` | Decline | Table D-H or Decline | Decline |
| `oxygen_therapy` | Decline | Table F-H | Table C-F |
| `wheelchair_bound` | Decline | Table C-F | Table B-D |
| `stroke_recent` | Postpone 12mo | Postpone 6mo, then Table | Postpone 6mo |
| `heart_attack_recent` | Postpone 12mo | Postpone 6mo, then Table | Postpone 6mo |
| `parkinsons_advanced` | Decline | Table D-H | Table C-F |
| `substance_abuse_active` | Decline | Decline | Decline |
| `intravenous_drug_use` | Decline | Decline | Decline |

**Generated as**: Separate rule sets per product_type
**Outcome**: Varies by product type (decline vs table rating vs postpone)

### Data Model Implications

```sql
-- Update underwriting_health_conditions to track knockout category
ALTER TABLE underwriting_health_conditions
  ADD COLUMN knockout_category TEXT CHECK (knockout_category IN ('absolute', 'conditional', 'standard'));
```

### Migration Plan for Existing Rules

```sql
-- Mark all existing generated knockout rules
UPDATE underwriting_rule_sets
SET source_type = 'generic_template',
    template_version = 1
WHERE source = 'imported'
  AND name LIKE 'Knockout:%';

-- Add warning flag
UPDATE underwriting_rule_sets
SET needs_review = true
WHERE source_type = 'generic_template';
```

### Preventing False Decisions

| Risk | Mitigation |
|------|------------|
| False Decline | Product-type scoping ensures term declines don't apply to whole |
| False Approval | Absolute knockouts remain global; no product-type override possible |
| Stale Templates | `template_version` tracking; UI warns when templates updated |
| Unreviewed Rules | `needs_review` flag; banner in UI; can't approve without clearing |

---

## 3. "Generate Rules" Redesign

### Decision: Keep But Make Safe + Useful

#### What Gets Generated

| Rule Type | Scope | Source Label | Default Status |
|-----------|-------|--------------|----------------|
| Absolute Knockouts | Carrier-global | `generic_template` | `draft` |
| Conditional Knockouts | Per product_type | `generic_template` | `draft` |
| Age Rules | Per product_id | `product_derived` | `draft` |

#### Generation Flow (Redesigned)

```
┌──────────────────────────────────────────────────────────┐
│ Step 1: Select Generation Type                            │
│ ○ Absolute Knockouts (applies to all products)           │
│ ○ Conditional Knockouts (select product types below)     │
│ ○ Age Rules from Products                                │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ Step 2: Select Product Types (if conditional)            │
│ ☑ Term Life                                              │
│ ☑ Whole Life                                             │
│ ☐ Final Expense                                          │
│ ☐ Universal Life                                         │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ Step 3: Review & Confirm                                  │
│                                                          │
│ ⚠️ WARNING: These are TEMPLATE rules based on industry   │
│ standards, NOT carrier-specific underwriting guidelines. │
│                                                          │
│ You MUST review and customize before approval.           │
│                                                          │
│ Will generate:                                           │
│ • 7 absolute knockout rule sets (carrier-global)         │
│ • 16 conditional knockout rule sets (8 per product type) │
│                                                          │
│ [Cancel] [Generate as Drafts]                            │
└──────────────────────────────────────────────────────────┘
```

#### Labeling & Audit Trail

```sql
-- Every generated rule set includes:
source_type = 'generic_template'
template_version = 2  -- increments when template logic changes
generated_at = NOW()
generated_by = user_id
needs_review = true
```

---

## 4. Schema Changes

### New Columns on `underwriting_rule_sets`

```sql
-- Migration: 20260112_010_rule_scoping_redesign.sql

-- Add product_type for type-level scoping
ALTER TABLE underwriting_rule_sets
  ADD COLUMN product_type product_type;

-- Add source tracking
DO $$ BEGIN
  CREATE TYPE rule_source_type AS ENUM (
    'generic_template',   -- Generated from built-in templates
    'carrier_document',   -- Extracted from carrier UW guide
    'manual'              -- Manually created by user
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE underwriting_rule_sets
  ADD COLUMN source_type rule_source_type DEFAULT 'manual';

ALTER TABLE underwriting_rule_sets
  ADD COLUMN template_version INTEGER;

ALTER TABLE underwriting_rule_sets
  ADD COLUMN needs_review BOOLEAN DEFAULT false;

-- Update check constraint for scoping
ALTER TABLE underwriting_rule_sets
  DROP CONSTRAINT IF EXISTS chk_condition_scope;

ALTER TABLE underwriting_rule_sets
  ADD CONSTRAINT chk_condition_scope CHECK (
    (scope = 'condition' AND condition_code IS NOT NULL) OR
    (scope = 'global' AND condition_code IS NULL)
  );

-- Add constraint: product_id and product_type are mutually exclusive
ALTER TABLE underwriting_rule_sets
  ADD CONSTRAINT chk_product_scope CHECK (
    NOT (product_id IS NOT NULL AND product_type IS NOT NULL)
  );

-- Index for efficient scope resolution
CREATE INDEX idx_rule_sets_scope_resolution
  ON underwriting_rule_sets (carrier_id, condition_code, product_type, product_id)
  WHERE review_status = 'approved' AND is_active = true;

COMMENT ON COLUMN underwriting_rule_sets.product_type IS
  'Product type scope. NULL = applies to all product types (carrier-global)';
COMMENT ON COLUMN underwriting_rule_sets.source_type IS
  'Origin of this rule set. Templates require review before approval.';
```

### Update to `underwriting_health_conditions`

```sql
-- Add knockout categorization
ALTER TABLE underwriting_health_conditions
  ADD COLUMN knockout_category TEXT
    CHECK (knockout_category IN ('absolute', 'conditional', 'standard'))
    DEFAULT 'standard';

-- Update existing knockout conditions
UPDATE underwriting_health_conditions SET knockout_category = 'absolute'
WHERE code IN ('aids_hiv', 'als', 'alzheimers', 'dementia', 'hospice', 'metastatic_cancer', 'organ_transplant_waiting');

UPDATE underwriting_health_conditions SET knockout_category = 'conditional'
WHERE code IN ('dialysis', 'oxygen_therapy', 'wheelchair_bound', 'stroke_recent', 'heart_attack_recent', 'parkinsons_advanced', 'substance_abuse_active', 'intravenous_drug_use');
```

### New Function: Get Knockout Conditions by Category

```sql
CREATE OR REPLACE FUNCTION get_knockout_conditions_by_category(
  p_category TEXT DEFAULT NULL  -- 'absolute', 'conditional', or NULL for all
)
RETURNS TABLE (
  code TEXT,
  name TEXT,
  category TEXT,
  knockout_category TEXT,
  default_outcome_term JSONB,
  default_outcome_whole JSONB,
  default_outcome_fe JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    code,
    name,
    category,
    knockout_category,
    -- Term Life outcomes
    CASE knockout_category
      WHEN 'absolute' THEN '{"eligibility": "ineligible", "healthClass": "decline"}'::jsonb
      WHEN 'conditional' THEN
        CASE code
          WHEN 'dialysis' THEN '{"eligibility": "ineligible", "healthClass": "decline"}'
          WHEN 'oxygen_therapy' THEN '{"eligibility": "ineligible", "healthClass": "decline"}'
          WHEN 'wheelchair_bound' THEN '{"eligibility": "ineligible", "healthClass": "decline"}'
          WHEN 'stroke_recent' THEN '{"eligibility": "refer", "healthClass": "refer", "reason": "Postpone 12 months"}'
          WHEN 'heart_attack_recent' THEN '{"eligibility": "refer", "healthClass": "refer", "reason": "Postpone 12 months"}'
          ELSE '{"eligibility": "ineligible", "healthClass": "decline"}'
        END::jsonb
      ELSE '{"eligibility": "refer", "healthClass": "refer"}'::jsonb
    END as default_outcome_term,
    -- Whole Life outcomes
    CASE knockout_category
      WHEN 'absolute' THEN '{"eligibility": "ineligible", "healthClass": "decline"}'::jsonb
      WHEN 'conditional' THEN
        CASE code
          WHEN 'dialysis' THEN '{"eligibility": "refer", "healthClass": "substandard", "tableRating": "table_d"}'
          WHEN 'oxygen_therapy' THEN '{"eligibility": "refer", "healthClass": "substandard", "tableRating": "table_f"}'
          WHEN 'wheelchair_bound' THEN '{"eligibility": "refer", "healthClass": "substandard", "tableRating": "table_c"}'
          WHEN 'stroke_recent' THEN '{"eligibility": "refer", "healthClass": "refer", "reason": "Postpone 6 months, then table"}'
          WHEN 'heart_attack_recent' THEN '{"eligibility": "refer", "healthClass": "refer", "reason": "Postpone 6 months, then table"}'
          ELSE '{"eligibility": "refer", "healthClass": "substandard"}'
        END::jsonb
      ELSE '{"eligibility": "refer", "healthClass": "refer"}'::jsonb
    END as default_outcome_whole,
    -- Final Expense outcomes
    CASE knockout_category
      WHEN 'absolute' THEN '{"eligibility": "ineligible", "healthClass": "decline"}'::jsonb
      WHEN 'conditional' THEN
        CASE code
          WHEN 'dialysis' THEN '{"eligibility": "ineligible", "healthClass": "decline"}'
          WHEN 'oxygen_therapy' THEN '{"eligibility": "refer", "healthClass": "substandard", "tableRating": "table_c"}'
          WHEN 'wheelchair_bound' THEN '{"eligibility": "refer", "healthClass": "substandard", "tableRating": "table_b"}'
          WHEN 'stroke_recent' THEN '{"eligibility": "refer", "healthClass": "refer", "reason": "Postpone 6 months"}'
          WHEN 'heart_attack_recent' THEN '{"eligibility": "refer", "healthClass": "refer", "reason": "Postpone 6 months"}'
          ELSE '{"eligibility": "refer", "healthClass": "substandard"}'
        END::jsonb
      ELSE '{"eligibility": "refer", "healthClass": "refer"}'::jsonb
    END as default_outcome_fe
  FROM underwriting_health_conditions
  WHERE is_active = true
    AND (p_category IS NULL OR knockout_category = p_category)
  ORDER BY sort_order;
$$;
```

---

## 5. UI / Workflow Changes

### Rule Set Creation Flow

```
┌─────────────────────────────────────────────────────────┐
│ Create Rule Set                                          │
├─────────────────────────────────────────────────────────┤
│ Name: [________________________]                        │
│                                                         │
│ Scope:                                                  │
│ ○ Condition-Specific  ○ Global                          │
│                                                         │
│ Condition: [Dropdown - only if condition-specific]      │
│                                                         │
│ Applies To:                                             │
│ ○ All Products (carrier-wide)                           │
│ ○ Product Type: [Term Life ▼]                          │
│ ○ Specific Product: [Product dropdown ▼]               │
│                                                         │
│ [Cancel] [Create]                                       │
└─────────────────────────────────────────────────────────┘
```

### Source Type Badge

```tsx
// In rule set list and editor
<Badge variant={
  sourceType === 'generic_template' ? 'warning' :
  sourceType === 'carrier_document' ? 'success' :
  'secondary'
}>
  {sourceType === 'generic_template' && '⚠️ Template'}
  {sourceType === 'carrier_document' && '✓ Carrier Sourced'}
  {sourceType === 'manual' && 'Manual'}
</Badge>
```

### Template Warning Banner

```tsx
// Show when viewing/editing a template-sourced rule set
{ruleSet.source_type === 'generic_template' && (
  <Alert variant="warning" className="mb-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Template Rule Set</AlertTitle>
    <AlertDescription>
      This rule set was generated from industry-standard templates,
      NOT from carrier-specific underwriting guidelines.
      Review and customize before approving.
    </AlertDescription>
  </Alert>
)}
```

### Product Type Filter in List

```tsx
// Filter controls
<Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
  <SelectItem value="all">All Product Types</SelectItem>
  <SelectItem value="global">Carrier Global</SelectItem>
  <SelectItem value="term_life">Term Life</SelectItem>
  <SelectItem value="whole_life">Whole Life</SelectItem>
  <SelectItem value="final_expense">Final Expense</SelectItem>
</Select>
```

### Approval Guardrail

```tsx
// Block approval of unreviewed templates
{ruleSet.needs_review && (
  <Alert variant="destructive">
    This rule set requires review before approval.
    <Button onClick={() => markAsReviewed(ruleSet.id)}>
      Mark as Reviewed
    </Button>
  </Alert>
)}
```

---

## 6. Rule Evaluation Semantics

### Resolution Algorithm

```typescript
function resolveApplicableRuleSets(
  carrierId: string,
  productId: string,
  conditionCode: string
): RuleSet[] {
  // 1. Get product's type
  const product = getProduct(productId);
  const productType = product.product_type;

  // 2. Query all potentially applicable rule sets
  const candidates = query(`
    SELECT * FROM underwriting_rule_sets
    WHERE carrier_id = $1
      AND condition_code = $2
      AND review_status = 'approved'
      AND is_active = true
      AND (
        -- Product-specific match
        product_id = $3
        OR
        -- Product-type match (no product_id)
        (product_type = $4 AND product_id IS NULL)
        OR
        -- Carrier-global match (no product_type, no product_id)
        (product_type IS NULL AND product_id IS NULL)
      )
    ORDER BY
      -- Most specific first
      CASE
        WHEN product_id IS NOT NULL THEN 1
        WHEN product_type IS NOT NULL THEN 2
        ELSE 3
      END,
      version DESC
  `, [carrierId, conditionCode, productId, productType]);

  // 3. Return only the most specific level
  // (don't merge - most specific wins completely)
  if (candidates.some(c => c.product_id !== null)) {
    return candidates.filter(c => c.product_id !== null);
  }
  if (candidates.some(c => c.product_type !== null)) {
    return candidates.filter(c => c.product_type !== null);
  }
  return candidates; // carrier-global
}
```

### Precedence Rules

| Priority | Scope | Description |
|----------|-------|-------------|
| 1 (highest) | `product_id` set | Product-specific override |
| 2 | `product_type` set | Product-type rules |
| 3 (lowest) | Both NULL | Carrier-global fallback |

### Conflict Resolution

- **Most specific wins entirely** — no merging of rules across scopes
- **Within same scope**: Use `priority` field on individual rules
- **Multiple rule sets at same scope**: Use `version` DESC (latest first)
- **If no rules match**: Return rule set's `default_outcome`

### NOT/AND/OR Predicate Evaluation

```typescript
// Predicate evaluation (unchanged from v2)
function evaluatePredicate(pred: PredicateGroup, context: Context): boolean {
  if (pred.type === 'all') {
    return pred.children.every(c => evaluateNode(c, context));
  }
  if (pred.type === 'any') {
    return pred.children.some(c => evaluateNode(c, context));
  }
  if (pred.type === 'not') {
    return !evaluateNode(pred.children[0], context);
  }
  return evaluateLeaf(pred, context);
}
```

---

## 7. Implementation Plan

### Phase 0: Safety Labeling (Immediate) — 1 day
- [ ] Add `source_type`, `template_version`, `needs_review` columns
- [ ] Mark all existing generated rules as `generic_template`
- [ ] Add warning banner to UI for template rules
- [ ] Disable approval of rules with `needs_review = true`

### Phase 1: Product Type Scoping — 3 days
- [ ] Add `product_type` column and enum
- [ ] Update `generate_global_knockout_rules` to:
  - Generate absolute knockouts as carrier-global
  - Generate conditional knockouts per product_type
- [ ] Update rule resolution query to use precedence
- [ ] Add product_type selector to UI

### Phase 2: Template Improvements — 2 days
- [ ] Implement `get_knockout_conditions_by_category()`
- [ ] Add multi-step generation wizard with product type selection
- [ ] Add "mark as reviewed" workflow
- [ ] Show product type badges in rule set list

### Phase 3: Quality & Monitoring — 2 days
- [ ] Add analytics: rules by source type, product type
- [ ] Add regression tests for scope resolution
- [ ] Add UI tests for template warnings
- [ ] Document the scoping model

### Future: Document Import Pipeline
- [ ] PDF parsing for carrier UW guides
- [ ] AI extraction with confidence scores
- [ ] `source_type = 'carrier_document'` with provenance

---

## 8. Test Plan

### DB Function Tests

```sql
-- Test: Absolute knockouts are carrier-global
SELECT * FROM generate_global_knockout_rules(
  carrier_id, imo_id, user_id,
  ARRAY['aids_hiv', 'als'], -- absolute only
  'skip_if_exists'
);
-- Assert: Created rules have product_type IS NULL

-- Test: Conditional knockouts are product-type scoped
SELECT * FROM generate_conditional_knockout_rules(
  carrier_id, imo_id, user_id,
  ARRAY['term_life', 'whole_life'],
  'skip_if_exists'
);
-- Assert: Created rules have product_type = 'term_life' or 'whole_life'
```

### Scope Resolution Tests

```typescript
// Test: Product-specific overrides product-type
test('product-specific rule overrides product-type rule', async () => {
  // Setup: Create product-type rule (decline) and product-specific rule (table C)
  const productTypeRule = await createRuleSet({
    condition_code: 'wheelchair_bound',
    product_type: 'whole_life',
    product_id: null,
    outcome: 'decline'
  });

  const productRule = await createRuleSet({
    condition_code: 'wheelchair_bound',
    product_type: null,
    product_id: specificProductId,
    outcome: 'table_c'
  });

  // Act
  const result = await resolveRuleSets(carrierId, specificProductId, 'wheelchair_bound');

  // Assert: Product-specific wins
  expect(result[0].id).toBe(productRule.id);
  expect(result[0].outcome).toBe('table_c');
});
```

### Product Type Differentiation Test

```typescript
// Test: Same condition, different outcomes by product type
test('wheelchair_bound has different outcome for term vs whole', async () => {
  // Setup: Term = decline, Whole = table C
  await generateConditionalKnockouts(carrierId, ['term_life', 'whole_life']);

  const termProduct = products.find(p => p.product_type === 'term_life');
  const wholeProduct = products.find(p => p.product_type === 'whole_life');

  // Act
  const termResult = await evaluateCondition(termProduct.id, 'wheelchair_bound');
  const wholeResult = await evaluateCondition(wholeProduct.id, 'wheelchair_bound');

  // Assert
  expect(termResult.eligibility).toBe('ineligible');
  expect(wholeResult.eligibility).toBe('refer');
  expect(wholeResult.healthClass).toBe('substandard');
});
```

### Source Label Tests

```typescript
// Test: Generated rules have correct source_type
test('generated rules are labeled as generic_template', async () => {
  await generateGlobalKnockoutRules(carrierId, imoId, userId);

  const rules = await getRuleSets(carrierId);
  const generated = rules.filter(r => r.source === 'imported');

  generated.forEach(r => {
    expect(r.source_type).toBe('generic_template');
    expect(r.needs_review).toBe(true);
  });
});
```

### UI Regression Tests

```typescript
// Test: Template warning is visible
test('template rules show warning banner', async () => {
  render(<RuleSetEditor ruleSet={templateRuleSet} />);

  expect(screen.getByText(/Template Rule Set/)).toBeInTheDocument();
  expect(screen.getByText(/NOT from carrier-specific/)).toBeInTheDocument();
});

// Test: Cannot approve unreviewed template
test('cannot approve rule set that needs review', async () => {
  render(<ApprovalActions status="pending_review" needsReview={true} />);

  expect(screen.getByText(/requires review/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
});
```

---

## Summary

| Decision | Choice |
|----------|--------|
| Knockout approach | Split into Absolute (global) + Conditional (product-type scoped) |
| Generate Rules | Keep, but with product type selection + clear template labeling |
| Scope model | 3-tier: product_id > product_type > carrier-global |
| Source tracking | `source_type` enum + `needs_review` flag |
| Conflict resolution | Most specific scope wins entirely (no merge) |

This design prevents false declines on whole life products for conditions that should be table-rated, while keeping truly universal knockouts at the carrier level for efficiency.
