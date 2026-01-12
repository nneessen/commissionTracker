# Underwriting Wizard Tri-State Eligibility Rebuild

## Status: FULLY DEPLOYED

Build verification: ✅ npm run build passes with zero TypeScript errors
Dev server test: ✅ Server starts without loading errors

## Summary
Updated the underwriting wizard decision engine to properly handle uncertainty:
- Eligibility is now tri-state: `eligible`, `ineligible`, `unknown`
- Products with unknown eligibility are kept in results but ranked lower
- Derived confidence penalty applied based on data completeness

## Files Changed

### src/services/underwriting/decisionEngine.ts
- Updated `checkEligibility()` to return `EligibilityResult` with tri-state status
- Updated `calculateApproval()` to fetch draft rules for FYI display
- Updated `calculateScore()` with derived confidence multiplier (0.5 to 1.0)
- Updated `getRecommendations()` to keep unknown eligibility products
- Added `unknownEligibility` array to result
- Added `ScoreComponents` breakdown to recommendations
- Added `draftRulesFyi` for showing draft rules that don't affect scoring

### src/services/underwriting/conditionMatcher.ts (new)
- Zod-validated rule DSL for field requirements
- `evaluateConditionAgainstRule()` for matching responses against rules
- `calculateDataCompleteness()` for confidence scoring

### src/services/underwriting/acceptanceService.ts
- Added `getDraftRulesForConditions()` for fetching draft/pending rules
- Added `getRulesNeedingReview()` for admin review dashboard
- Added `createDraftRuleFromExtraction()` - always creates as draft
- Updated `lookupAcceptance()` to filter by review_status='approved' by default

### src/features/underwriting/types/underwriting.types.ts
- Added `EligibilityStatus`, `EligibilityResult`, `MissingFieldInfo`
- Added `ScoreComponents`, `RuleProvenance`, `DraftRuleInfo`
- Added `ConditionDecision` with `isApproved` and `provenance` fields
- Added `SessionRecommendation` interface

### src/features/underwriting/components/WizardSteps/RecommendationsStep.tsx
- Added `UnknownEligibilityCard` component with yellow styling
- Updated `DecisionEngineCard` to show draft rules FYI and confidence indicators
- Updated Decision Engine section to display `unknownEligibility` array
- Added stats footer showing eligible/unknown/ineligible counts

## Migrations Created (not yet applied)
- `20260111_001_eligibility_tristate.sql` - underwriting_session_recommendations table
- `20260111_002_acceptance_provenance.sql` - provenance columns on carrier_condition_acceptance
- `20260111_003_condition_field_requirements.sql` - required_fields and field_requirements columns

## Key Design Decisions
1. Eligibility is per-product, not per-session
2. Only approved rules affect scoring; draft rules shown as FYI
3. Confidence multiplier: 0.5 + (dataConfidence * 0.5) for unknown status
4. AI-extracted rules are always created as draft
5. TEXT + CHECK instead of ENUM for eligibility status
6. Reference user_profiles(id), not auth.users(id)

## Deployment Complete

All migrations applied:
- ✅ 20260111_001_eligibility_tristate.sql
- ✅ 20260111_002_acceptance_provenance.sql  
- ✅ 20260111_003_condition_field_requirements.sql

Database types regenerated and build passing.

Next: Test end-to-end with actual underwriting session to verify UI displays correctly.