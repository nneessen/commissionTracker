# AI Underwriting Wizard - Phase 3 Implementation

## Context
Implementing Phase 3 of the AI-powered underwriting wizard. Phase 1 (core wizard) and Phase 2 (Decision Tree Editor) are complete, including code review fixes.

## Branch
`feature/underwriting-wizard` (already checked out)

## What's Complete

### Phase 1 - Core Wizard
- Database tables: `underwriting_health_conditions`, `underwriting_guides`, `underwriting_decision_trees`, `underwriting_sessions`
- 28 health conditions seeded with dynamic follow-up schemas
- RLS policies (IMO-scoped)
- Feature flag function: `is_underwriting_wizard_enabled(p_agency_id)`
- 5-step wizard: ClientInfo → HealthConditions → CoverageRequest → Review → Recommendations
- Edge function: `supabase/functions/underwriting-ai-analyze/index.ts`

### Phase 2 - Decision Tree Editor
- DecisionTreeEditor with RuleBuilder, RuleConditionRow, RuleActionConfig
- CRUD hooks: useDecisionTrees, useCreateDecisionTree, useUpdateDecisionTree, etc.
- DecisionTreeRepository following BaseRepository pattern
- Atomic RPC for set-default operation
- "AI Underwriting" button in PolicyList (feature-gated)

### Code Review Fixes (Just Completed)
- Created `src/services/underwriting/DecisionTreeRepository.ts`
- Created `src/features/underwriting/hooks/useCarriersWithProducts.ts`
- Created `src/features/underwriting/utils/ruleUtils.ts`
- Created `supabase/migrations/20260109_004_set_default_decision_tree_rpc.sql`
- Fixed string interpolation security issue
- Added input validation to RuleConditionRow
- Replaced window.confirm with AlertDialog
- Added CarrierWithProducts type to underwriting.types.ts

## Phase 3 Scope

### 1. Settings Page Integration (Priority 1)
Add "Underwriting" tab to SettingsDashboard with:
- Decision Tree management (list, create, edit, delete, set default)
- Guide management placeholder (for PDF uploads)
- Feature toggle for enabling/disabling wizard per agency

**Key file:** `src/features/settings/SettingsDashboard.tsx`
- Uses shadcn Tabs component
- Tab visibility controlled by permissions (canManageCarriers, isImoAdmin, etc.)
- Each tab renders a dedicated component

**Pattern to follow:**
```tsx
// In validTabs array, add "underwriting"
// Add TabsTrigger with Stethoscope icon
// Add TabsContent rendering UnderwritingSettingsTab
// Gate behind canManageCarriers or similar permission
```

### 2. Session History (Priority 2)
Components needed in `src/features/underwriting/components/SessionHistory/`:
- `SessionHistoryList.tsx` - Table of past sessions with filters
- `SessionDetailDialog.tsx` - View saved session details in dialog

**Existing hook:** `src/features/underwriting/hooks/useUnderwritingSessions.ts`
- `useUnderwritingSessions()` - fetches sessions for current user
- `useUnderwritingSession(id)` - fetches single session
- `useSaveUnderwritingSession()` - saves new session

**Session data includes:**
- Client info (name, age, gender, state, BMI)
- Health responses and conditions reported
- Tobacco use details
- Coverage request (face amount, product types)
- AI analysis results (health tier, risk factors, recommendations)

### 3. Guide Management UI (Priority 3)
Components needed in `src/features/underwriting/components/GuideManager/`:
- `GuideUploader.tsx` - Upload PDFs to Supabase storage
- `GuideList.tsx` - List guides per carrier
- `GuideViewer.tsx` - Preview parsed content

**Storage pattern:** Use Supabase storage bucket
**Existing pattern:** Check `src/services/documents/documentStorageService.ts`

### 4. Admin Feature Toggle (Priority 4)
- Add UI toggle in settings to enable/disable wizard per agency
- Update `agencies.settings.underwriting_wizard_enabled` via JSONB update
- Check existing pattern in `src/features/settings/agency/`

## File Structure to Create

```
src/features/underwriting/
├── components/
│   ├── SessionHistory/
│   │   ├── SessionHistoryList.tsx
│   │   ├── SessionDetailDialog.tsx
│   │   └── index.ts
│   ├── GuideManager/
│   │   ├── GuideUploader.tsx
│   │   ├── GuideList.tsx
│   │   ├── GuideViewer.tsx
│   │   └── index.ts
│   └── UnderwritingSettingsTab.tsx  # Main settings tab component
├── hooks/
│   └── useUnderwritingGuides.ts     # CRUD for guides
└── services/
    └── guideStorageService.ts       # Supabase storage operations
```

## Implementation Order

1. **UnderwritingSettingsTab** - Create settings tab wrapper with sub-tabs
2. **Decision Tree Management** - Integrate existing DecisionTreeEditor into settings
3. **SessionHistoryList** - Table showing past sessions
4. **SessionDetailDialog** - Dialog to view session details
5. **Feature Toggle** - Add agency setting toggle
6. **GuideList** - List existing guides
7. **GuideUploader** - Upload new guides
8. **GuideViewer** - Preview guide content

## Design Standards (from CLAUDE.md)
- Compact, professional, data-dense layout
- Minimal padding (Tailwind 1/2/3 scale)
- Small readable text (text-[11px], text-[12px])
- Muted palette with subtle borders
- Prefer tables over cards for lists
- Desktop-optimized but responsive

## Progress

### Completed
- ✅ Priority 1: Settings Page Integration
  - `UnderwritingSettingsTab.tsx` - Main tab with sub-tabs
  - `DecisionTreeList.tsx` - CRUD for decision trees
  - Added "Underwriting" tab to `SettingsDashboard.tsx`
- ✅ Priority 2: Session History
  - `SessionHistoryList.tsx` - Table of past sessions
  - `SessionDetailDialog.tsx` - View session details
  - `SessionHistory/index.ts` - Barrel export
- ✅ Code Review Fixes
  - `src/features/underwriting/utils/formatters.ts` - Shared utilities
  - Error handling in async handlers
  - Type-safe JSON parsing with `safeParseJsonArray/Object`
  - `isValidHealthTier` type guard

### Completed
- ✅ Priority 3: Guide Management UI
  - `src/services/underwriting/guideStorageService.ts` - Supabase storage operations
  - `src/features/underwriting/hooks/useUnderwritingGuides.ts` - CRUD hooks
  - `src/features/underwriting/components/GuideManager/GuideList.tsx` - List with view/delete
  - `src/features/underwriting/components/GuideManager/GuideUploader.tsx` - Upload dialog with drag-drop
  - `src/features/underwriting/components/GuideManager/index.ts` - Barrel exports
- ✅ Priority 4: Admin Feature Toggle
  - `src/features/underwriting/hooks/useUnderwritingToggle.ts` - Toggle agencies.settings JSONB
  - Updated `FeatureSettingsPanel` in UnderwritingSettingsTab with working toggle

## Phase 3 Complete

All priorities completed:
1. ✅ Settings Page Integration (Decision Tree management)
2. ✅ Session History (List + Detail views)
3. ✅ Guide Management UI (PDF upload/list)
4. ✅ Admin Feature Toggle

Typecheck passes. Ready for testing and potential Phase 4 work (e.g., guide parsing, AI integration improvements).

## Key Files Reference

### Existing underwriting files:
- `src/features/underwriting/hooks/useDecisionTrees.ts`
- `src/features/underwriting/hooks/useUnderwritingSessions.ts`
- `src/features/underwriting/hooks/useUnderwritingFeatureFlag.ts`
- `src/features/underwriting/components/DecisionTreeEditor/`
- `src/features/underwriting/types/underwriting.types.ts`
- `src/services/underwriting/DecisionTreeRepository.ts`

### Settings pattern files:
- `src/features/settings/SettingsDashboard.tsx`
- `src/features/settings/carriers/CarriersManagement.tsx`
- `src/features/settings/agency/AgencyManagement.tsx`

### Storage pattern files:
- `src/services/documents/documentStorageService.ts`
- `src/services/documents/DocumentRepository.ts`
