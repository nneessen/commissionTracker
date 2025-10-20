# PLAN: Reorganize Reusable Components to custom_ui Directory

## Problem
Reusable components are incorrectly stored in feature folders and mixed with shadcn components in `src/components/ui/`. This violates component organization best practices where:
- Reusable components should NEVER be in feature folders
- Custom components should be separate from shadcn UI primitives

## Solution
Create `src/components/custom_ui/` directory and move all custom reusable components there, leaving only shadcn primitives in `src/components/ui/`.

## Components to Move

### From Feature Folders to custom_ui:
1. **src/features/auth/components/Alert.tsx** → src/components/custom_ui/Alert.tsx
   - Generic alert component with success/error/info/warning variants
   - Used across the app for notifications

2. **src/features/auth/components/EmailIcon.tsx** → src/components/custom_ui/EmailIcon.tsx
   - Reusable email icon component
   - Can be used anywhere email visualization needed

3. **src/features/analytics/components/InfoButton.tsx** → src/components/custom_ui/InfoButton.tsx
   - Generic info button with expandable content
   - Useful for help text throughout app

4. **src/features/analytics/ChartCard.tsx** → src/components/custom_ui/ChartCard.tsx
   - Reusable chart wrapper component
   - Used for displaying various chart types

5. **src/features/analytics/MetricsCard.tsx** → src/components/custom_ui/MetricsCard.tsx
   - Reusable metrics display card
   - Used for KPI displays throughout app

### From src/components/ui to custom_ui:
6. **src/components/ui/DataTable.tsx** → src/components/custom_ui/DataTable.tsx
   - Custom data table implementation

7. **src/components/ui/Modal.tsx** → src/components/custom_ui/Modal.tsx
   - Custom modal component

8. **src/components/ui/Select.tsx** → src/components/custom_ui/Select.tsx
   - Custom select component (uppercase S indicates custom)

9. **src/components/ui/TimePeriodSelector.tsx** → src/components/custom_ui/TimePeriodSelector.tsx
   - Custom time period selection component

10. **src/components/ui/MetricTooltip.tsx** → src/components/custom_ui/MetricTooltip.tsx
    - Custom tooltip for metrics

11. **src/components/ui/stat-card.tsx** → src/components/custom_ui/stat-card.tsx
    - Custom statistics card component

12. **src/components/ui/empty-state.tsx** → src/components/custom_ui/empty-state.tsx
    - Custom empty state component

13. **src/components/ui/heading.tsx** → src/components/custom_ui/heading.tsx
    - Custom heading component

14. **src/components/ui/chart.tsx** → src/components/custom_ui/chart.tsx (CHECK FIRST)
    - Might be custom chart wrapper - need to verify

## Import Updates Required

### Files importing from feature folders:
- Search and replace all imports from:
  - `@/features/auth/components/Alert` → `@/components/custom_ui/Alert`
  - `@/features/auth/components/EmailIcon` → `@/components/custom_ui/EmailIcon`
  - `@/features/analytics/components/InfoButton` → `@/components/custom_ui/InfoButton`
  - `@/features/analytics/ChartCard` → `@/components/custom_ui/ChartCard`
  - `@/features/analytics/MetricsCard` → `@/components/custom_ui/MetricsCard`

### Files importing from ui folder (custom components):
- Search and replace all imports from:
  - `@/components/ui/DataTable` → `@/components/custom_ui/DataTable`
  - `@/components/ui/Modal` → `@/components/custom_ui/Modal`
  - `@/components/ui/Select` → `@/components/custom_ui/Select`
  - `@/components/ui/TimePeriodSelector` → `@/components/custom_ui/TimePeriodSelector`
  - `@/components/ui/MetricTooltip` → `@/components/custom_ui/MetricTooltip`
  - `@/components/ui/stat-card` → `@/components/custom_ui/stat-card`
  - `@/components/ui/empty-state` → `@/components/custom_ui/empty-state`
  - `@/components/ui/heading` → `@/components/custom_ui/heading`
  - `@/components/ui/Input` → `@/components/ui/input` (fix case sensitivity)

## Execution Steps

1. **Create custom_ui directory**
   ```bash
   mkdir -p src/components/custom_ui
   ```

2. **Move components from feature folders** (5 files)
   - Move Alert.tsx, EmailIcon.tsx, InfoButton.tsx, ChartCard.tsx, MetricsCard.tsx

3. **Move custom components from ui folder** (8-9 files)
   - Move DataTable, Modal, Select, TimePeriodSelector, MetricTooltip, stat-card, empty-state, heading
   - Check chart.tsx to determine if custom or shadcn

4. **Update all imports across codebase**
   - Use search and replace for each moved component
   - Fix Input import case sensitivity issue

5. **Create index.ts for custom_ui**
   - Export all custom components for cleaner imports

6. **Update any index.ts files**
   - Remove exports from feature folders
   - Update ui/index.ts if needed

7. **Test the application**
   - Run build to check for import errors
   - Start dev server to verify runtime

## Expected Outcome
- Clear separation: `ui/` for shadcn primitives, `custom_ui/` for our custom components
- No reusable components in feature folders
- Consistent import paths
- Better discoverability of reusable components

## Files to be Modified (Estimated)
- ~14 component files to move
- ~20-30 files with import updates
- 2-3 index.ts files to update