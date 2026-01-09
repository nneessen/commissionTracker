# AI Underwriting Wizard - Continuation Prompt

## Context
Implementing an AI-powered underwriting wizard for life insurance. Phase 1 (core wizard) and Phase 2 (Decision Tree Editor) are complete. Continue with Phase 3 (Guide Manager, Session History).

## Branch
`feature/underwriting-wizard` (already checked out)

## What's Done

### Phase 1 - Core Wizard (COMPLETE)

#### Database (APPLIED to production)
- 4 tables created: `underwriting_health_conditions`, `underwriting_guides`, `underwriting_decision_trees`, `underwriting_sessions`
- 28 health conditions seeded with dynamic follow-up schemas
- RLS policies (IMO-scoped)
- Feature flag function: `is_underwriting_wizard_enabled(p_agency_id)`

#### Frontend Components
```
src/features/underwriting/
├── components/
│   ├── UnderwritingWizard.tsx          # Main 5-step wizard
│   └── WizardSteps/
│       ├── ClientInfoStep.tsx          # Demographics + BMI
│       ├── HealthConditionsStep.tsx    # Condition picker + dynamic follow-ups
│       ├── CoverageRequestStep.tsx     # Face amount + product types
│       ├── ReviewStep.tsx              # Summary before AI
│       └── RecommendationsStep.tsx     # AI results display
├── hooks/
│   ├── useHealthConditions.ts
│   ├── useUnderwritingFeatureFlag.ts
│   ├── useUnderwritingAnalysis.ts
│   └── useUnderwritingSessions.ts
├── utils/bmiCalculator.ts
├── types/underwriting.types.ts
└── index.ts
```

#### Edge Function (DEPLOYED)
- `supabase/functions/underwriting-ai-analyze/index.ts` - Claude API integration
- **IMPORTANT**: User must set ANTHROPIC_API_KEY secret:
  ```bash
  npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
  ```

### Phase 2 - Decision Tree Editor (COMPLETE)

#### New Components
```
src/features/underwriting/components/DecisionTreeEditor/
├── DecisionTreeEditor.tsx    # Main editor with rule list
├── RuleBuilder.tsx           # Build rules with conditions + actions
├── RuleConditionRow.tsx      # Single condition (field/operator/value)
├── RuleActionConfig.tsx      # Carrier/product recommendations
└── index.ts
```

#### New Hooks
```
src/features/underwriting/hooks/useDecisionTrees.ts
├── useDecisionTrees()           # List all decision trees
├── useDecisionTree(id)          # Fetch single tree
├── useActiveDecisionTree()      # Get default tree
├── useCreateDecisionTree()      # Create new tree
├── useUpdateDecisionTree()      # Update existing tree
├── useDeleteDecisionTree()      # Delete tree
└── useSetDefaultDecisionTree()  # Set default tree
```

#### Wizard Trigger (COMPLETE)
- Added "AI Underwriting" button to PolicyList header
- Gated behind `useUnderwritingFeatureFlag()` hook
- Opens wizard in modal dialog

## What's Remaining (Phase 3+)

### 1. Guide Management UI (PDF Upload)
Components needed in `src/features/underwriting/components/GuideManager/`:
- `GuideUploader.tsx` - Upload PDFs to Supabase storage
- `GuideList.tsx` - List guides per carrier
- `GuideViewer.tsx` - Preview parsed content

### 2. Session History
- `SessionHistory.tsx` - List past sessions
- `SessionDetail.tsx` - View saved session details

### 3. Admin Feature Toggle
- Add UI in settings to enable/disable wizard per agency
- Update `agencies.settings.underwriting_wizard_enabled`

### 4. Settings Page Integration
- Add "Underwriting" tab to Settings page
- Include Decision Tree management
- Include Guide management
- Include feature toggle

## Key Design Decisions Made
- **AI**: Claude API (claude-sonnet-4-20250514)
- **Guide Storage**: PDF in Supabase storage + AI parsing
- **Strategy Config**: Decision tree editor (JSON rules)
- **Output**: Ranked recommendations with reasons
- **Audit**: Optional save (user chooses)
- **Access**: Feature flag per agency
- **Conditions**: 28 predefined with dynamic follow-ups

## To Continue
Start new conversation with:
```
Continue implementing the AI Underwriting Wizard on branch feature/underwriting-wizard.

Phase 1 & 2 are complete - see plans/active/underwriting-wizard-continuation.md for details.

Next priorities:
1. Set ANTHROPIC_API_KEY secret (npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx)
2. Add Settings page integration for managing Decision Trees
3. Build Guide Manager UI for uploading carrier underwriting guides
4. Build Session History to view past underwriting sessions

Read the continuation file first, then proceed with implementation.
```
