# Deterministic Rule Generation - Design Document

## 1. Problem Restatement

The goal is to automatically generate **draft** underwriting rule sets for carriers based on:

1. **Global Knockout Rules**: Carrier-wide disqualification criteria (e.g., specific diseases, high-risk activities) that apply regardless of product
2. **Age-Based Product Rules**: Per-product age eligibility rules derived from the `min_age`/`max_age` columns in the `products` table

### Constraints
- Never overwrite **approved** rule sets
- All generated rules must be `review_status='draft'` and `source='imported'`
- Operations must be transactional (all-or-nothing)
- Authorization enforced via RLS and RPC auth checks (not frontend-only)
- Strategy options: `create_new_draft` | `upsert_draft` | `skip_if_exists`

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Admin UI)                          │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ Generate Knockout    │  │ Generate Age Rules                   │ │
│  │ Rules Button         │  │ from Products Button                 │ │
│  └──────────┬───────────┘  └──────────────────┬───────────────────┘ │
│             │                                  │                     │
│             ▼                                  ▼                     │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │              useGenerateRules Hook (TanStack Query)              ││
│  └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        generateRulesService.ts                       │
│  ┌────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ generateKnockoutRules()    │  │ generateAgeRulesFromProducts() │ │
│  └────────────┬───────────────┘  └────────────────┬───────────────┘ │
│               │                                    │                 │
│               ▼                                    ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                    Supabase RPC Calls                            ││
│  └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Supabase (PostgreSQL)                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ generate_global_knockout_rules(carrier_id, imo_id, user_id,    │ │
│  │                                knockout_codes[], strategy)      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ generate_age_rules_from_products(carrier_id, imo_id, user_id,  │ │
│  │                                  product_ids[], strategy)       │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model & Schema

### Existing Schema (No Changes Required)

**products table:**
```sql
- id: uuid
- carrier_id: uuid
- name: text
- min_age: integer (nullable)
- max_age: integer (nullable)
```

**underwriting_rule_sets table:**
```sql
- id: uuid
- carrier_id: uuid
- imo_id: uuid
- product_id: uuid (nullable - null = carrier-wide)
- name: text
- scope: rule_set_scope ('condition' | 'global')
- condition_code: text (nullable)
- source: text ('manual' | 'ai_extracted' | 'imported')
- review_status: rule_review_status ('draft' | 'pending_review' | 'approved' | 'rejected')
- variant: text (default 'default')
```

**underwriting_rules table:**
```sql
- id: uuid
- rule_set_id: uuid
- name: text
- priority: integer
- predicate: jsonb
- age_band_min: integer (nullable)
- age_band_max: integer (nullable)
- outcome_eligibility: text
- outcome_health_class: health_class
- outcome_reason: text
```

### Knockout Condition Codes (Predefined)

These are common knockout conditions that typically result in immediate decline:

| Code | Name | Severity |
|------|------|----------|
| `aids_hiv` | AIDS/HIV | Absolute |
| `als` | ALS (Lou Gehrig's Disease) | Absolute |
| `alzheimers` | Alzheimer's Disease | Absolute |
| `organ_transplant_waiting` | Awaiting Organ Transplant | Absolute |
| `dialysis` | Currently on Dialysis | Absolute |
| `hospice` | Hospice Care | Absolute |
| `intravenous_drug_use` | IV Drug Use (Current) | Absolute |
| `metastatic_cancer` | Metastatic Cancer | Absolute |
| `oxygen_therapy` | Continuous Oxygen Therapy | Absolute |
| `wheelchair_bound` | Wheelchair Bound | Conditional |

---

## 4. API & Data Flow Design

### RPC Function 1: `generate_global_knockout_rules`

**Purpose:** Create draft rule sets for global knockout conditions

**Signature:**
```sql
generate_global_knockout_rules(
  p_carrier_id uuid,
  p_imo_id uuid,
  p_user_id uuid,
  p_knockout_codes text[],
  p_strategy text DEFAULT 'skip_if_exists'
) RETURNS jsonb
```

**Parameters:**
- `p_carrier_id`: Target carrier
- `p_imo_id`: IMO for tenant isolation
- `p_user_id`: User creating the rules (for audit)
- `p_knockout_codes`: Array of condition codes to generate rules for
- `p_strategy`: How to handle existing rule sets
  - `skip_if_exists`: Skip if a draft/approved rule set already exists for this condition
  - `create_new_draft`: Always create a new draft (versioned)
  - `upsert_draft`: Update existing draft or create new if none exists

**Returns:**
```json
{
  "success": true,
  "created": 5,
  "skipped": 2,
  "rule_set_ids": ["uuid1", "uuid2", ...]
}
```

### RPC Function 2: `generate_age_rules_from_products`

**Purpose:** Create draft rule sets for age eligibility per product

**Signature:**
```sql
generate_age_rules_from_products(
  p_carrier_id uuid,
  p_imo_id uuid,
  p_user_id uuid,
  p_product_ids uuid[] DEFAULT NULL,  -- NULL = all products for carrier
  p_strategy text DEFAULT 'skip_if_exists'
) RETURNS jsonb
```

**Returns:**
```json
{
  "success": true,
  "created": 3,
  "skipped": 1,
  "products_processed": 4,
  "rule_set_ids": ["uuid1", "uuid2", ...]
}
```

---

## 5. Predicate Templates

### Age Ineligible (Below Minimum)
```json
{
  "type": "all",
  "children": [
    {
      "type": "numeric",
      "field": "client.age",
      "operator": "lt",
      "value": 18
    }
  ]
}
```

### Age Ineligible (Above Maximum)
```json
{
  "type": "all",
  "children": [
    {
      "type": "numeric",
      "field": "client.age",
      "operator": "gt",
      "value": 85
    }
  ]
}
```

### Knockout Condition Present
```json
{
  "type": "all",
  "children": [
    {
      "type": "condition_presence",
      "field": "condition.present",
      "operator": "eq",
      "value": true
    }
  ]
}
```

---

## 6. Frontend Integration Plan

### Hook: `useGenerateRules`

Located at: `src/features/underwriting/hooks/useGenerateRules.ts`

```typescript
// Mutations
useGenerateKnockoutRules() -> mutateAsync({ carrierId, knockoutCodes, strategy })
useGenerateAgeRules() -> mutateAsync({ carrierId, productIds?, strategy })

// Cache invalidation on success
queryClient.invalidateQueries({ queryKey: ruleEngineKeys.ruleSets(carrierId) })
```

### UI Components

Add to `AcceptanceRulesTab.tsx`:
1. "Generate Global Rules" dropdown button (admin only)
   - "Generate Knockout Rules" menu item
   - "Generate Age Rules from Products" menu item
2. Confirmation dialog with strategy selection
3. Success/error toast notifications

---

## 7. Implementation Steps

### Step 1: Migration (SQL RPC Functions)
File: `supabase/migrations/YYYYMMDD_001_generate_rules_rpc.sql`

### Step 2: Service Layer
File: `src/services/underwriting/generateRulesService.ts`

### Step 3: TanStack Query Hook
File: `src/features/underwriting/hooks/useGenerateRules.ts`

### Step 4: UI Integration
Modify: `src/features/underwriting/components/AcceptanceRules/AcceptanceRulesTab.tsx`

### Step 5: Types Update
Run: `npx supabase gen types typescript --project-id <id> > src/types/database.types.ts`

---

## 8. Test Plan

### Unit Tests
- [ ] Predicate template generation functions
- [ ] Service function error handling

### Integration Tests
- [ ] RPC function with valid inputs
- [ ] Strategy behavior (skip_if_exists, create_new_draft, upsert_draft)
- [ ] Transaction rollback on partial failure

### RLS Tests
- [ ] Non-admin user cannot call generation RPCs
- [ ] IMO isolation is enforced
- [ ] Cross-carrier access is blocked

---

## 9. Risk & Failure Analysis

| Risk | Mitigation |
|------|------------|
| Overwriting approved rules | RPC checks `review_status` before any operation |
| Partial transaction failure | All inserts wrapped in `BEGIN...COMMIT` block |
| Invalid predicate JSON | Validate structure in RPC before insert |
| Duplicate rule sets | Strategy parameter controls behavior |
| Performance with many products | Batch inserts, limit to 50 products per call |
| Frontend-only auth bypass | RPC checks `auth.uid()` and role |

---

## 10. Implementation Checklist

- [ ] Create migration file with RPC functions
- [ ] Apply migration to database
- [ ] Regenerate TypeScript types
- [ ] Create `generateRulesService.ts`
- [ ] Create `useGenerateRules.ts` hook
- [ ] Add UI buttons to AcceptanceRulesTab
- [ ] Add confirmation dialogs
- [ ] Test all strategies
- [ ] Test RLS policies
- [ ] Update documentation
