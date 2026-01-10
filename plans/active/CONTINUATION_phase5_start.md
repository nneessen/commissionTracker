# Phase 5: Criteria-Driven Decision Engine - START

## Status: Ready to Implement

## Context

Phase 4 (Decision Engine Integration) is complete. The underwriting wizard now runs two parallel analysis systems:
1. **Decision Engine** - Instant rate table lookups (~100-500ms)
2. **AI Analysis** - Claude-powered guide analysis (3-15s)

Phase 5 integrates AI-extracted and human-approved underwriting criteria from `carrier_underwriting_criteria` into the Edge Function, enabling deterministic rule-based filtering BEFORE the AI call.

## What Exists

- `carrier_underwriting_criteria` table with structured criteria (age limits, knockouts, build requirements, etc.)
- Criteria extraction workflow (Phase 4) - AI extracts, humans review/approve
- Criteria marked `is_active = true` when approved
- Edge Function `underwriting-ai-analyze` currently does NOT use this criteria

## What Needs to Be Built

### 1. Database Index
**File:** `supabase/migrations/20260110_012_criteria_decision_index.sql`
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_criteria_active_carrier
  ON carrier_underwriting_criteria(carrier_id, is_active)
  WHERE is_active = TRUE;
```

### 2. Criteria Evaluator Module
**File:** `supabase/functions/underwriting-ai-analyze/criteria-evaluator.ts`

Functions to implement:
- `evaluateCriteria(criteria, client, health, coverage)` → eligibility result
- `buildCriteriaContext(criteriaByCarrier)` → structured text for AI prompt

Criteria rules to evaluate:
- Age limits (min/max issue age)
- Face amount limits (with age tiers)
- Knockout conditions (condition codes that auto-decline)
- State availability (available/unavailable states)
- Build requirements (BMI thresholds for rating classes)
- Tobacco rules (clean months for non-smoker classification)

### 3. Edge Function Integration
**File:** `supabase/functions/underwriting-ai-analyze/index.ts`

Changes:
1. Import criteria-evaluator module
2. Fetch active criteria for eligible carriers after carrier fetch
3. Apply criteria filtering BEFORE AI call
4. Replace raw guide excerpts with structured criteria context
5. Add `criteriaFilters` to response

### 4. TypeScript Types
**File:** `src/features/underwriting/types/underwriting.types.ts`

Add:
```typescript
export interface CriteriaFilterResult {
  applied: boolean;
  matchedCarriers: string[];
  filteredByCarrier: {
    carrierId: string;
    carrierName: string;
    rule: string;
    reason: string;
  }[];
}

// Add to AIAnalysisResult:
criteriaFilters?: CriteriaFilterResult;
```

### 5. Hook Update
**File:** `src/features/underwriting/hooks/useUnderwritingAnalysis.ts`

Map new `criteriaFilters` field from response.

## Implementation Order

1. Create migration file → Apply migration
2. Create `criteria-evaluator.ts` with types and functions
3. Modify Edge Function `index.ts` to integrate criteria
4. Update TypeScript types
5. Update hook
6. Regenerate database types
7. Run typecheck and build

## Key Design Decisions

- **Criteria takes precedence** over product metadata when available
- **Structured criteria replaces raw excerpts** in AI prompt (more token-efficient)
- **Graceful fallback** - carriers without criteria use existing behavior
- **Performance target** - criteria lookup adds <50ms

## Full Plan Reference

See: `plans/active/CONTINUATION_phase5_criteria_decision_engine.md`

## Start Command

```
Implement Phase 5: Criteria-Driven Decision Engine

Context:
- Phase 4 complete (Decision Engine + AI running in parallel)
- Now integrate `carrier_underwriting_criteria` into the Edge Function
- Apply deterministic criteria filtering BEFORE AI call

Tasks:
1. Create migration: `supabase/migrations/20260110_012_criteria_decision_index.sql`
2. Create: `supabase/functions/underwriting-ai-analyze/criteria-evaluator.ts`
3. Modify: `supabase/functions/underwriting-ai-analyze/index.ts`
4. Update types in `src/features/underwriting/types/underwriting.types.ts`
5. Update hook `src/features/underwriting/hooks/useUnderwritingAnalysis.ts`
6. Regenerate types, typecheck, build

Reference: plans/active/CONTINUATION_phase5_criteria_decision_engine.md
```
