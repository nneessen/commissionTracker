# Underwriting Rule Engine V2 Implementation

## Status: FULLY IMPLEMENTED AND APPLIED

The v2 rule engine has been implemented but the database migration needs to be applied before full use.

## Summary

Replaced the naive `carrier_condition_acceptance` lookup table with a deterministic, multi-factor rule engine capable of real underwriting logic.

## Key Files Created/Modified

### New Files
1. `supabase/migrations/20260111_004_underwriting_rule_engine.sql`
   - ENUM types: `table_rating`, `health_class`, `rule_set_scope`, `rule_review_status`
   - Helper functions: `table_rating_units()`, `health_class_rank()`, etc.
   - Tables: `underwriting_rule_sets`, `underwriting_rules`, `underwriting_rule_evaluation_log`
   - Complete RLS policies for all tables
   - Hardened approval/rejection RPCs with state machine enforcement

2. `src/services/underwriting/ruleEngineDSL.ts`
   - Typed Zod schemas for predicate DSL v2
   - Support for: numeric, date, boolean, string, array, set, null_check, condition_presence
   - Compound predicate groups: all (AND), any (OR), not
   - Utility functions for table ratings and health class ranking

3. `src/services/underwriting/ruleEvaluator.ts`
   - `evaluatePredicate()` - Compound predicate evaluation with proper unknown propagation
   - `evaluateRuleSet()` - Rule set evaluation with first-match-wins semantics
   - `aggregateOutcomes()` - Aggregation using MAX table units (not multiply!)
   - `buildFactMap()` - Canonical fact map builder

4. `src/services/underwriting/ruleService.ts`
   - CRUD operations for rule sets and rules
   - Approval workflow functions: `submitForReview()`, `approveRuleSet()`, `rejectRuleSet()`
   - Evaluation logging for audit trail

### Modified Files
5. `src/services/underwriting/decisionEngine.ts`
   - Added `evaluateUnderwritingV2()` - Main entry point for v2 evaluation
   - Added `hasV2RulesForCarrier()` - Check if carrier has v2 rules
   - Backward compatible with existing v1 evaluation

## Critical Design Decisions

### 1. Table Rating Aggregation: MAX, NOT MULTIPLY
- Table ratings are ordinal (A=1 through P=16)
- Aggregated using MAX across conditions (worst wins)
- NOT multiplicative (which was incorrect)

### 2. Default Fallback: UNKNOWN, NOT DECLINE
- Missing rules → `unknown` or `refer`, never `decline`
- Safe default prevents accidental declines from incomplete rule sets

### 3. Unknown Propagation
- ALL group: any unknown → unknown (with specific missing fields)
- ANY group: unknown only if could change outcome
- Returns specific missing field paths, not generic "any"

### 4. Cross-Condition Rules (Global Scope)
- `scope: 'global'` rule sets evaluate multi-morbidity interactions
- e.g., diabetes + hypertension + BMI combination rules
- Evaluated BEFORE condition-specific rules

### 5. Review Workflow
- States: draft → pending_review → approved/rejected
- Only approved rules affect evaluations
- Self-approval prevented in RPC
- Reviewer != creator enforced

## Completed Steps

1. **Migration applied:** 2026-01-12 via `./scripts/apply-migration.sh`
   - Fixed `is_imo_admin()` function to use `roles` array instead of `role` column
2. **Types regenerated:** `src/types/database.types.ts` updated with new types
3. **ruleService.ts updated:** Now uses generated types from database.types.ts

## Next Steps (Optional Frontend Work)

1. **Create rule sets via admin UI or service:**
   - Start with condition-specific rules
   - Add global rules for multi-morbidity

2. **Enable v2 evaluation in underwriting wizard:**
   - Use `hasV2RulesForCarrier()` to check for v2 rules
   - Call `evaluateUnderwritingV2()` instead of v1

3. **Build admin UI for rule management:**
   - Rule set CRUD with approval workflow
   - Visual predicate builder with JSON "Advanced" toggle
   - Review dashboard for pending approvals

## Example Rule DSL

```json
{
  "version": 2,
  "root": {
    "all": [
      { "type": "numeric", "field": "diabetes_type_2.a1c", "operator": "lte", "value": 7.0 },
      { "type": "boolean", "field": "diabetes_type_2.insulin_use", "operator": "eq", "value": false },
      { "type": "date", "field": "diabetes_type_2.diagnosis_date", "operator": "years_since_gte", "value": 2 }
    ]
  }
}
```

## Build Status
- ✅ TypeScript build passes with zero errors
- ✅ Migration applied to production database
- ✅ database.types.ts regenerated with new types
- ✅ ruleService.ts uses generated types
- ✅ Dev server starts without runtime errors
