# Carrier Acceptance Rules v2

## Overview

The Carrier Acceptance Rules feature enables insurance professionals to define, manage, and apply underwriting acceptance criteria for different carriers. Version 2 introduces **compound predicates** with AND/OR/NOT logic, an **approval workflow**, and a modern UI built with TanStack Query.

This feature answers the question: "For a given client profile and health condition, what is this carrier's likely underwriting decision?"

---

## Key Concepts

### Rule Sets

A **Rule Set** is a collection of rules that apply to a specific carrier. Rule sets can be:

- **Condition-specific**: Rules that apply only when evaluating a particular health condition (e.g., Diabetes Type 2, Hypertension)
- **Global**: Rules that apply regardless of condition (e.g., age limits, tobacco use)

Each rule set has:
- `name` - Descriptive name
- `description` - Optional details
- `scope` - Either "condition" or "global"
- `condition_code` - The health condition this applies to (if scope is "condition")
- `product_id` - Optional product restriction
- `is_active` - Whether the rule set is currently in use
- `review_status` - Approval workflow status

### Rules

A **Rule** within a rule set defines a single acceptance criterion. Each rule contains:

- **Predicate**: The condition logic (compound AND/OR/NOT expressions)
- **Outcome**: What happens when the predicate matches (eligible, ineligible, refer)
- **Filters**: Optional age band and gender restrictions
- **Priority**: Evaluation order (lower = evaluated first)

### Compound Predicates

Predicates use a tree structure supporting:

```typescript
// AND - all children must match
{ type: "all", children: [...] }

// OR - any child must match
{ type: "any", children: [...] }

// NOT - negates the child
{ type: "not", child: {...} }

// Leaf condition - actual field check
{ type: "numeric", field: "condition.a1c", operator: "lte", value: 7.0 }
```

### Approval Workflow

Rule sets follow a review workflow:

```
draft → pending_review → approved
                      ↘ rejected → draft
```

- **Draft**: Editable, not active in production
- **Pending Review**: Submitted for approval, locked for editing
- **Approved**: Active in production, locked
- **Rejected**: Returned to draft with feedback

---

## Database Schema

### `underwriting_rule_sets`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| carrier_id | uuid | Foreign key to carriers |
| product_id | uuid | Optional product restriction |
| name | text | Display name |
| description | text | Optional description |
| scope | text | "condition" or "global" |
| condition_code | text | Health condition code (if scope="condition") |
| is_active | boolean | Whether currently in use |
| review_status | text | Workflow status |
| created_by | uuid | User who created |
| reviewed_by | uuid | User who approved/rejected |
| reviewed_at | timestamp | When reviewed |
| review_notes | text | Approval/rejection notes |

### `underwriting_rules`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| rule_set_id | uuid | Foreign key to rule_sets |
| priority | integer | Evaluation order |
| name | text | Rule name |
| description | text | Optional description |
| predicate | jsonb | Compound predicate tree |
| age_band_min | integer | Minimum age filter |
| age_band_max | integer | Maximum age filter |
| gender | text | Gender filter (male/female/null) |
| outcome_eligibility | text | eligible/ineligible/refer |
| outcome_health_class | text | Preferred Plus to Decline |
| outcome_table_rating | text | None or A-P |
| outcome_flat_extra_per_thousand | numeric | Flat extra amount |
| outcome_flat_extra_years | integer | Duration of flat extra |
| outcome_reason | text | Human-readable explanation |
| outcome_concerns | text[] | List of concerns/flags |
| source | text | manual/ai_extracted/imported |
| extraction_confidence | numeric | AI confidence score |
| source_pages | integer[] | PDF page references |
| source_snippet | text | Original text excerpt |

---

## Component Architecture

```
AcceptanceRulesTab
├── RuleSetList (table of rule sets)
│   └── StatusBadge
└── RuleSetEditor (sheet)
    ├── Metadata form (name, scope, condition)
    ├── Rules list with reorder
    ├── ApprovalActions
    └── RuleEditor (dialog)
        ├── PredicateBuilder
        │   ├── PredicateGroupBuilder (recursive)
        │   │   └── PredicateLeafBuilder
        │   └── PredicateJsonEditor
        ├── OutcomeEditor
        ├── Filters (age, gender)
        └── ProvenanceTooltip
```

### Component Descriptions

| Component | Purpose |
|-----------|---------|
| `AcceptanceRulesTab` | Main container, carrier selection, orchestrates all state |
| `RuleSetList` | Table displaying rule sets with status, actions |
| `RuleSetEditor` | Sheet for editing rule set metadata and managing rules |
| `RuleEditor` | Dialog for creating/editing individual rules |
| `PredicateBuilder` | Wrapper with Visual/JSON mode toggle |
| `PredicateGroupBuilder` | Recursive component for AND/OR/NOT groups |
| `PredicateLeafBuilder` | Single condition row (field, operator, value) |
| `PredicateJsonEditor` | Raw JSON editor with Zod validation |
| `OutcomeEditor` | Form for eligibility, health class, table rating, etc. |
| `ApprovalActions` | Status-aware workflow buttons |
| `ProvenanceTooltip` | Displays AI extraction source info |

---

## Field Registry

The `fieldRegistry.ts` defines available fields for predicates:

### Client Fields (always available)

| Field | Type | Description |
|-------|------|-------------|
| client.age | numeric | Client age in years |
| client.gender | set | male/female |
| client.smoker | boolean | Tobacco use |
| client.bmi | numeric | Body mass index |

### Condition-Specific Fields

Fields vary by condition code. Examples for `diabetes_type_2`:

| Field | Type | Description |
|-------|------|-------------|
| condition.a1c | numeric | A1C percentage |
| condition.years_since_diagnosis | numeric | Years since diagnosis |
| condition.insulin_use | boolean | Currently using insulin |
| condition.complications | array | diabetic_retinopathy, neuropathy, etc. |

---

## Operators by Type

| Type | Operators |
|------|-----------|
| numeric | eq, neq, gt, gte, lt, lte, between |
| date | years_since_gte, years_since_lte, years_since_between |
| boolean | eq, neq |
| string | eq, neq, contains, starts_with, ends_with |
| set | in, not_in |
| array | includes_any, includes_all, excludes_any, excludes_all |
| null_check | is_null, is_not_null |

---

## TanStack Query Hooks

### Rule Set Hooks (`useRuleSets.ts`)

```typescript
// Fetch rule sets for a carrier
const { data } = useRuleSets(carrierId, { includeInactive: true });

// Fetch single rule set with rules
const { data } = useRuleSet(ruleSetId);

// Mutations
const createRuleSet = useCreateRuleSet();
const updateRuleSet = useUpdateRuleSet();
const deleteRuleSet = useDeleteRuleSet();
```

### Rule Hooks (`useRules.ts`)

```typescript
const createRule = useCreateRule();
const updateRule = useUpdateRule();
const deleteRule = useDeleteRule();
const reorderRules = useReorderRules();
```

### Workflow Hooks (`useRuleWorkflow.ts`)

```typescript
const submitForReview = useSubmitForReview();
const approveRuleSet = useApproveRuleSet();
const rejectRuleSet = useRejectRuleSet();
const revertToDraft = useRevertToDraft();
```

---

## Predicate DSL

### Structure

```typescript
type PredicateGroup = {
  type: "all" | "any";
  children: (PredicateGroup | PredicateNot | FieldCondition)[];
} | {
  type: "not";
  child: PredicateGroup | FieldCondition;
};

type FieldCondition = {
  type: "numeric" | "date" | "boolean" | "string" | "set" | "array" | "null_check";
  field: string;
  operator: string;
  value: any;
  treatNullAs?: "unknown" | "fail";
};
```

### Example Predicate

"Client is diabetic with A1C ≤ 7.0 AND not using insulin"

```json
{
  "type": "all",
  "children": [
    {
      "type": "numeric",
      "field": "condition.a1c",
      "operator": "lte",
      "value": 7.0
    },
    {
      "type": "boolean",
      "field": "condition.insulin_use",
      "operator": "eq",
      "value": false
    }
  ]
}
```

---

## Evaluation Logic

### Rule Evaluation Order

1. Filter rule sets by carrier, product, and condition
2. For each rule set (sorted by priority):
   a. Check age band filter
   b. Check gender filter
   c. Evaluate predicate tree
3. First matching rule wins
4. Return outcome (eligibility, health class, etc.)

### Null Handling

Fields can be missing from client data. The `treatNullAs` option controls behavior:

- `"unknown"` (default): Null values propagate as unknown, rule continues evaluation
- `"fail"`: Null values cause the condition to fail immediately

---

## Usage Guide

### Creating a Rule Set

1. Navigate to **Underwriting → Acceptance Rules**
2. Select a carrier from the dropdown
3. Click **Create Rule Set**
4. Fill in:
   - Name (required)
   - Description (optional)
   - Scope: "Condition" or "Global"
   - Condition (if scope is "Condition")
5. Click **Save Changes**

### Adding Rules

1. Open a rule set
2. Click **Add Rule**
3. Configure the predicate (Visual or JSON mode)
4. Set the outcome (eligibility, health class, etc.)
5. Optionally set age/gender filters
6. Click **Save**

### Approval Workflow

1. **Draft**: Make all necessary edits
2. Click **Submit for Review**
3. Reviewer clicks **Approve** or **Reject**
4. If rejected, rule set returns to draft with notes
5. Once approved, rule set is active in production

### Reordering Rules

- Use the up/down arrows in the rules table
- Lower priority numbers evaluate first
- First matching rule determines outcome

---

## AI Extraction Support

Rules can be extracted from carrier underwriting guides via AI. Extracted rules include:

- `source`: "ai_extracted"
- `extraction_confidence`: 0.0-1.0 confidence score
- `source_pages`: PDF page numbers
- `source_snippet`: Original text excerpt

The `ProvenanceTooltip` component displays this information for transparency.

---

## Files Reference

```
src/features/underwriting/
├── components/
│   ├── AcceptanceRules/
│   │   └── AcceptanceRulesTab.tsx    # Main tab component
│   └── RuleEngine/
│       ├── index.ts                   # Barrel exports
│       ├── fieldRegistry.ts           # Field definitions
│       ├── PredicateBuilder.tsx       # Visual/JSON toggle
│       ├── PredicateGroupBuilder.tsx  # AND/OR/NOT groups
│       ├── PredicateLeafBuilder.tsx   # Single conditions
│       ├── PredicateJsonEditor.tsx    # JSON editor
│       ├── OutcomeEditor.tsx          # Outcome form
│       ├── RuleEditor.tsx             # Rule dialog
│       ├── RuleSetEditor.tsx          # Rule set sheet
│       ├── RuleSetList.tsx            # Rule sets table
│       ├── ApprovalActions.tsx        # Workflow buttons
│       └── ProvenanceTooltip.tsx      # AI source info
├── hooks/
│   ├── useRuleSets.ts                 # Rule set queries
│   ├── useRules.ts                    # Rule mutations
│   └── useRuleWorkflow.ts             # Workflow mutations
└── ...

src/services/underwriting/
├── ruleService.ts                     # Database operations
└── ruleEngineDSL.ts                   # Types & validation
```

---

## Related Documentation

- [Rule Engine DSL](/docs/underwriting/rule-engine-dsl.md) - Detailed predicate syntax
- [Underwriting Guide Parser](/docs/underwriting/guide-parser.md) - AI extraction
- [Decision Engine](/docs/underwriting/decision-engine.md) - Runtime evaluation
