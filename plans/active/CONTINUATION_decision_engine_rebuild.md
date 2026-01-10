# Decision Engine Rebuild - Continuation Plan

## Status: Phase 2 & 3 COMPLETE - Ready for Integration

## Context

The current decision tree system is broken - 13 rules each with all 49 products alphabetically sorted. No actual decision logic.

User requirements gathered:
- **Pricing**: Manual entry from carrier portals, willing to enter for top 5-10 carriers
- **Decision logic**: Combination of health, age, budget, needs for term vs whole
- **Priority**: Lowest premium is top priority
- **Knowledge**: Tribal knowledge (in head), willing to enter carrier acceptance rules
- **Results**: Top 3 with tradeoffs (Cheapest, Highest Coverage, Best Approval)
- **Top carriers**: Mutual of Omaha, Baltimore Life, Transamerica
- **Outcome tracking**: Yes, track recommendations → approvals/declines
- **Face amounts**: Wide range $10K to $1M+
- **Commission**: Does not factor into recommendations

## Completed

### Phase 1: Data Foundation Tables ✅
- [x] `product_rate_table` - Stores premium rates per $1000 by carrier/product/age/health
- [x] `carrier_condition_acceptance` - Maps carrier + condition → acceptance decision
- [x] `recommendation_outcomes` - Tracks recommendation → outcome for learning
- [x] RLS policies for all tables
- [x] Helper functions: `calculate_premium`, `get_product_rate`, `get_carrier_acceptance`
- [x] Database types regenerated

**Migrations applied:**
- `20260110_013_decision_engine_foundation.sql`
- `20260110_014_fix_decision_engine_rls.sql`

### Phase 2: Rate Entry UI ✅
- [x] `src/services/underwriting/rateService.ts` - CRUD service for rate table
- [x] `src/features/underwriting/hooks/useRates.ts` - React Query hooks
- [x] `src/features/underwriting/components/RateEntry/RateEntryForm.tsx` - Form component
- [x] `src/features/underwriting/components/RateEntry/RateEntryTab.tsx` - Tab container
- [x] `src/features/underwriting/components/RateEntry/index.ts` - Exports
- [x] Added "Rates" tab to `UnderwritingSettingsTab.tsx`
- [x] Typecheck passes

### Phase 2.5: Condition Acceptance UI ✅
- [x] `src/services/underwriting/acceptanceService.ts` - CRUD for carrier_condition_acceptance
- [x] `src/features/underwriting/hooks/useAcceptance.ts` - React Query hooks
- [x] `src/features/underwriting/components/AcceptanceRules/AcceptanceRuleForm.tsx`
- [x] `src/features/underwriting/components/AcceptanceRules/AcceptanceRulesTab.tsx`
- [x] `src/features/underwriting/components/AcceptanceRules/index.ts`
- [x] Added "Acceptance" tab to `UnderwritingSettingsTab.tsx`
- [x] Typecheck passes

### Phase 3: Decision Engine Module ✅
- [x] `src/services/underwriting/decisionEngine.ts` - Core decision engine
  - Client profile input (age, gender, state, BMI, tobacco, conditions)
  - Coverage request (face amount, product types)
  - FILTER: Products by age limits, face amount limits
  - CLASSIFY: Health class based on conditions, tobacco status
  - LOOKUP: Carrier acceptance rules for each condition
  - PRICE: Calculate premium using rate table
  - RANK: Return top 3 (cheapest, highest coverage, best approval)
- [x] Typecheck passes
- [x] Build passes

## Next Steps

### Phase 4: Integration
Location: Replace existing AI wizard with decision engine integration

1. **Create useRecommendations hook**:
   - `src/features/underwriting/hooks/useRecommendations.ts`
   - React Query wrapper for decision engine
   - Cache results by client profile hash

2. **Build Recommendations UI**:
   - `src/features/underwriting/components/Recommendations/RecommendationCard.tsx`
   - `src/features/underwriting/components/Recommendations/RecommendationsPanel.tsx`
   - Show top 3 with badges (Cheapest, Most Coverage, Best Approval)
   - Display monthly premium, approval likelihood, concerns

3. **Integrate with Policy Flow**:
   - Add recommendation step to underwriting wizard
   - Allow selection of recommended product
   - Track which recommendation was chosen

4. **AI Query Interface** (optional enhancement):
   - Keep AI for questions like "Which carriers accept X?"
   - AI becomes query interface, not decision maker
   - Decision engine handles actual recommendations

### Phase 5: Outcome Learning
1. Track recommendation → outcome (approved/declined)
2. Update approval_likelihood based on actual outcomes
3. Show accuracy metrics on dashboard
4. Improve recommendations over time

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA FOUNDATION                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ product_rates   │ carrier_rules   │ products.metadata           │
│ (manual entry)  │ (manual entry)  │ (age tiers, limits)         │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                       │
         ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DECISION ENGINE                              │
│  (TypeScript module - deterministic, testable, no AI)           │
├─────────────────────────────────────────────────────────────────┤
│  1. FILTER: Age, state, face amount, knockouts, full UW         │
│  2. CLASSIFY: Health tier, tobacco class                        │
│  3. LOOKUP: Carrier condition acceptance → approval likelihood   │
│  4. PRICE: Rate per $1000 × face amount = premium               │
│  5. RANK: Return Top 3 (Cheapest, Most Coverage, Best Approval) │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TOP 3 RECOMMENDATIONS                        │
├─────────────────────────────────────────────────────────────────┤
│  #1 CHEAPEST: Baltimore Life Term 20 - $45/mo, $250K, 85% likely│
│  #2 MOST COVERAGE: Transamerica - $65/mo, $500K, 75% likely     │
│  #3 BEST APPROVAL: Mutual of Omaha - $55/mo, $250K, 95% likely  │
└─────────────────────────────────────────────────────────────────┘
```

## Files Created This Session

**Services:**
- `src/services/underwriting/acceptanceService.ts`
- `src/services/underwriting/decisionEngine.ts`

**Hooks:**
- `src/features/underwriting/hooks/useAcceptance.ts`

**Components:**
- `src/features/underwriting/components/AcceptanceRules/AcceptanceRuleForm.tsx`
- `src/features/underwriting/components/AcceptanceRules/AcceptanceRulesTab.tsx`
- `src/features/underwriting/components/AcceptanceRules/index.ts`

**Modified:**
- `src/features/underwriting/hooks/useRates.ts` (fixed userProfile → user)
- `src/features/underwriting/components/RateEntry/RateEntryTab.tsx` (fixed import)
- `src/features/underwriting/components/UnderwritingSettingsTab.tsx` (added Acceptance tab)

## Key Decisions Made

1. **Less AI, more deterministic rules** - AI is for queries, not decisions
2. **Manual data entry** - User will enter rates and acceptance rules
3. **Top 3 with tradeoffs** - Show cheapest, highest coverage, best approval
4. **Outcome tracking** - Track recommendations → approvals to improve over time
5. **Commission ignored** - Recommend what's best for client
