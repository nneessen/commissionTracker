# Dashboard Feature Gating - Continuation Prompt

## Status: IN PROGRESS (70% Complete)

## Context
Implementing subscription-based feature gating for the Dashboard page, starting from Free tier. The plan is documented in `plans/active/dashboard-feature-gating.md`.

## What's Been Completed

### 1. Infrastructure Created
- `src/hooks/dashboard/useDashboardFeatures.ts` - Hook returning `canViewExpenses`, `canAddExpense`, `canViewReports`, `canExportReports`, `canViewBasicTargets`, `canViewFullTargets`, `tier`, `isAdmin`
- `src/hooks/dashboard/index.ts` - Exports
- `src/features/dashboard/components/GatedStat.tsx` - Locked stat display with lock icon + tooltip
- `src/features/dashboard/components/GatedAction.tsx` - Locked button with upgrade prompt
- `src/features/dashboard/components/GatedKPISection.tsx` - Blurred section with upgrade overlay

### 2. Types Updated
- `src/types/dashboard.types.ts`:
  - `StatItemConfig` - Added `gated?: boolean`, `gatedTooltip?: string`
  - `QuickAction` - Added `hasAccess?: boolean`, `lockedTooltip?: string`, `requiredTier?: string`
  - `KPISection` - Added `gated?: boolean`, `requiredTier?: string`

### 3. Components Updated
- `src/features/dashboard/components/StatItem.tsx` - Now shows lock icon + tooltip when `stat.gated === true`
- `src/features/dashboard/components/QuickActionsPanel.tsx` - Now shows locked buttons when `action.hasAccess === false`
- `src/features/dashboard/components/index.ts` - Exports GatedStat, GatedAction, GatedKPISection

### 4. Config Files Updated
- `src/features/dashboard/config/statsConfig.ts`:
  - Added `features?: DashboardFeatures` param
  - Gates: Expenses, Net Income, Breakeven, Policies Needed (all require `canViewExpenses`)
- `src/features/dashboard/config/metricsConfig.ts`:
  - Added `features?: DashboardFeatures` param
  - Gates: Target column visibility requires `canViewBasicTargets`

### 5. DashboardHome.tsx Updated
- Added `useDashboardFeatures` hook
- Passes `features: dashboardFeatures` to `generateStatsConfig` and `generateMetricsConfig`
- Updated `quickActions` array with gating for "Add Expense" and "View Reports"

## What Remains To Do

### 1. Update KPIGridHeatmap (In Progress)
File: `src/features/dashboard/components/KPIGridHeatmap.tsx`

Need to wrap gated sections with blur overlay. The "Financial Details" section should be gated for Free tier users (requires `expenses` feature).

**Implementation:**
```tsx
// Import GatedKPISection
import { GatedKPISection } from "./GatedKPISection";

// In the render, wrap each section conditionally:
{section.gated ? (
  <GatedKPISection
    hasAccess={false}
    title={section.category}
    requiredTier={section.requiredTier || "Starter"}
  >
    {/* existing section content */}
  </GatedKPISection>
) : (
  // existing section content
)}
```

### 2. Update kpiConfig.ts
File: `src/features/dashboard/config/kpiConfig.ts`

Add `features?: DashboardFeatures` param and gate "Financial Details" section:
```typescript
{
  category: "Financial Details",
  kpis: [...],
  gated: !canViewExpenses,
  requiredTier: "Starter",
}
```

### 3. Pass features to kpiConfig in DashboardHome.tsx
```typescript
const kpiConfig = generateKPIConfig({
  // existing params...
  features: dashboardFeatures,
});
```

### 4. Run Typecheck and Build
```bash
npm run typecheck
npm run build
```

### 5. Test Each Tier
- Free: Expenses/Net Income/Breakeven/Policies Needed show "—" with lock; Add Expense/View Reports locked; Financial Details KPI section blurred
- Starter: All above unlocked; targets visible
- Pro/Team: Full access

## Files to Reference
- Plan: `plans/active/dashboard-feature-gating.md`
- Hook: `src/hooks/dashboard/useDashboardFeatures.ts`
- Types: `src/types/dashboard.types.ts`
- Main: `src/features/dashboard/DashboardHome.tsx`

## Subscription Tier Quick Reference
- **Free**: dashboard, policies, comp_guide, settings, connect_upline
- **Starter** ($10): + expenses, targets_basic, reports_view
- **Pro** ($25): + email, sms, targets_full, reports_export, 5 downlines max
- **Team** ($50): + hierarchy, recruiting, overrides, downline_reports, unlimited downlines

## Admin Bypass
Super admin emails bypass all gating: `nick@nickneessen.com`, `nickneessen@thestandardhq.com`
