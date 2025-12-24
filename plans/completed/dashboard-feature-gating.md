# Dashboard Feature Gating Plan

## Status: PLANNING

## Overview

Methodical implementation of subscription-based feature gating for the Dashboard page (`/dashboard`), starting from Free tier and working up through each tier.

---

## Current Dashboard Components

| Component | Location | Purpose |
|-----------|----------|---------|
| DashboardHeader | Inline | Title, TimePeriodSwitcher, PeriodNavigator, DateRangeDisplay |
| QuickStatsPanel | Left column | 6 key stats (Commission, Expenses, Net Income, Pipeline, Breakeven, Policies Needed) |
| PerformanceOverviewCard | Center column | Performance metrics table with current vs target |
| AlertsPanel | Right column | Condition-based alerts/warnings |
| QuickActionsPanel | Right column | Add Policy, Add Expense, View Reports buttons |
| KPIGridHeatmap | Bottom | 3 sections: Financial Details, Policy Health, Client Details |

---

## Subscription Tier Reference

### Free Tier ($0/mo)
**Features:** `dashboard`, `policies`, `comp_guide`, `settings`, `connect_upline`
**Analytics Sections:** `pace_metrics`, `policy_status_breakdown`

### Starter Tier ($10/mo)
**Features:** + `expenses`, `targets_basic`, `reports_view`
**Analytics Sections:** + `product_matrix`, `carriers_products`, `client_segmentation`

### Pro Tier ($25/mo)
**Features:** + `email`, `sms`, `targets_full`, `reports_export`
**Analytics Sections:** + `geographic`, `game_plan`, `commission_pipeline`, `future_section`

### Team Tier ($50/mo)
**Features:** + `hierarchy`, `recruiting`, `overrides`, `downline_reports`
**Analytics Sections:** (same as Pro)

---

## TIER 1: FREE - What Users See

### Fully Visible (No Gating)
1. **DashboardHeader** - Full access to time period switching and navigation
2. **Basic Policy & Commission Stats**:
   - Commission earned (period)
   - Policies written (period)
   - Active policies count
   - Pending pipeline value

3. **AlertsPanel** - All alerts visible (they help users understand they need to take action)

4. **QuickActionsPanel**:
   - "Add Policy" - Always visible (policies feature is free)
   - "Add Expense" - **GATED** - Show upgrade prompt (requires `expenses` feature)
   - "View Reports" - **GATED** - Show upgrade prompt (requires `reports_view` feature)

### Gated/Hidden (Upgrade Required)
| Component/Metric | Required Feature | Required Tier | Gating Approach |
|------------------|------------------|---------------|-----------------|
| Expenses stats | `expenses` | Starter+ | Show "—" with lock icon, tooltip "Upgrade to Starter" |
| Net Income calculation | `expenses` | Starter+ | Show "—" with lock icon (can't calculate without expenses) |
| Breakeven calculation | `expenses` | Starter+ | Show "—" with lock icon |
| Policies Needed calculation | `expenses` | Starter+ | Show "—" with lock icon |
| Add Expense action | `expenses` | Starter+ | Disabled button with upgrade tooltip |
| View Reports action | `reports_view` | Starter+ | Disabled button with upgrade tooltip |
| KPIGrid: Financial Details | `expenses` | Starter+ | Section blurred with upgrade overlay |
| Basic Targets (current vs target) | `targets_basic` | Starter+ | Hide target column, show "—" |
| Full Targets (projections, pace) | `targets_full` | Pro+ | Show basic targets, gate advanced projections |

### Free Tier Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard    Performance overview     [MTD ▼] [◀ ▶] Dec 1-18   │
├────────────┬─────────────────────────────┬──────────────────────┤
│ QuickStats │ Performance Overview        │ Alerts               │
│            │                             │                      │
│ ✓ Commission│ Metric│Current│Target│%│S  │ ⚠ No Commissions    │
│ 🔒 Expenses │ Comm  │ $X    │ —   │—│— │ ⚠ Get Started        │
│ 🔒 Net Inc │ Pols  │ X     │ —   │—│— │                      │
│ ✓ Pipeline │ AP    │ $X    │ —   │—│— │ Quick Actions        │
│ 🔒 Breakevn │                           │ [Add Policy]         │
│ 🔒 Pol Need │                           │ [🔒 Add Expense]     │
│            │                             │ [🔒 View Reports]    │
├────────────┴─────────────────────────────┴──────────────────────┤
│ KPI Breakdown                                                    │
│ ┌──────────────────┬──────────────────┬───────────────────────┐ │
│ │ 🔒 Financial     │ ✓ Policy Health  │ ✓ Client Details      │ │
│ │    Details       │   Active: X      │   Total Clients: X    │ │
│ │    [Upgrade]     │   Retention: X%  │   Policies/Client: X  │ │
│ │                  │   Cancelled: X   │   Avg Value: $X       │ │
│ └──────────────────┴──────────────────┴───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## TIER 2: STARTER - Additional Access

### Newly Unlocked
1. **Expense Tracking**:
   - "Monthly Expenses" stat now visible with real data
   - "Add Expense" quick action enabled
   - KPIGrid "Financial Details" section fully visible

2. **Financial Calculations**:
   - Net Income now calculates (Commission - Expenses)
   - Breakeven calculation now works
   - Policies Needed calculation now works

3. **Reports Access**:
   - "View Reports" quick action enabled
   - Can view reports (but not export)

4. **Basic Targets**:
   - PerformanceOverviewCard shows target column
   - Basic pace metrics visible

### Still Gated (Pro+ Required)
| Component/Metric | Required Feature | Required Tier |
|------------------|------------------|---------------|
| Full targets with projections | `targets_full` | Pro+ |
| Report export functionality | `reports_export` | Pro+ |
| Game Plan analytics | `targets_full` | Pro+ |
| Commission pipeline view | `targets_full` | Pro+ |

---

## TIER 3: PRO - Additional Access

### Newly Unlocked
1. **Full Targets**:
   - Complete target tracking with projections
   - Game Plan analytics section
   - Commission pipeline visibility

2. **Report Export**:
   - Export buttons enabled throughout

3. **Communication** (not dashboard-specific):
   - Email features
   - SMS features

### Dashboard Same as Starter
Pro tier primarily adds communication features and full targets - dashboard visually similar to Starter but with enhanced analytics.

---

## TIER 4: TEAM - Full Access

### Newly Unlocked
1. **Team Metrics** (future enhancement):
   - Downline performance summary
   - Team production stats
   - Override income tracking

2. **Everything else already unlocked at Pro**

---

## Implementation Plan

### Phase 1: Create Dashboard Gating Infrastructure

#### 1.1 Create `useDashboardFeatures` Hook
```typescript
// src/hooks/dashboard/useDashboardFeatures.ts
// Returns which dashboard features are available for current user
interface DashboardFeatures {
  canViewExpenses: boolean;
  canAddExpense: boolean;
  canViewReports: boolean;
  canExportReports: boolean;
  canViewTargets: boolean;
  canViewFullTargets: boolean;
  tier: 'free' | 'starter' | 'pro' | 'team';
}
```

#### 1.2 Create `GatedStat` Component
```typescript
// src/features/dashboard/components/GatedStat.tsx
// Wraps a stat to show locked state if user doesn't have access
interface GatedStatProps {
  feature: FeatureKey;
  children: React.ReactNode;
  lockedValue?: string; // Default "—"
  lockedTooltip?: string; // e.g., "Upgrade to Starter to track expenses"
}
```

#### 1.3 Create `GatedAction` Component
```typescript
// src/features/dashboard/components/GatedAction.tsx
// Wraps a quick action button with gating logic
interface GatedActionProps {
  feature: FeatureKey;
  children: React.ReactNode;
  onUpgradeClick?: () => void;
}
```

### Phase 2: Apply Gating to QuickStatsPanel

#### 2.1 Update `statsConfig.ts`
Add feature requirements to each stat configuration:
```typescript
{
  label: 'Monthly Expenses',
  value: formatCurrency(periodExpenses.total),
  requiredFeature: 'expenses', // NEW
  lockedMessage: 'Upgrade to track expenses',
}
```

#### 2.2 Update `QuickStatsPanel.tsx`
Wrap stats with `GatedStat` component.

### Phase 3: Apply Gating to QuickActionsPanel

#### 3.1 Update Quick Actions Config
```typescript
const quickActions = [
  { label: "Add Policy", action: "Add Policy" }, // Always available
  { label: "Add Expense", action: "Add Expense", requiredFeature: "expenses" },
  { label: "View Reports", action: "View Reports", requiredFeature: "reports_view" },
];
```

#### 3.2 Update QuickActionsPanel Component
Apply gating to buttons based on feature access.

### Phase 4: Apply Gating to PerformanceOverviewCard

#### 4.1 Gate Target Column
If user doesn't have `targets_basic`, hide target and percentage columns.

### Phase 5: Apply Gating to KPIGridHeatmap

#### 5.1 Gate "Financial Details" Section
Requires `expenses` feature - blur/overlay if not available.

### Phase 6: Update DashboardHome.tsx

#### 6.1 Integrate Feature Checks
```typescript
const { canViewExpenses, canViewReports, canViewTargets } = useDashboardFeatures();

// Pass gating info to child components
<QuickStatsPanel stats={statsConfig} features={dashboardFeatures} />
<QuickActionsPanel actions={quickActions} features={dashboardFeatures} />
```

---

## File Changes Required

### New Files
1. `src/hooks/dashboard/useDashboardFeatures.ts`
2. `src/features/dashboard/components/GatedStat.tsx`
3. `src/features/dashboard/components/GatedAction.tsx`
4. `src/features/dashboard/components/GatedKPISection.tsx`

### Modified Files
1. `src/features/dashboard/DashboardHome.tsx` - Integrate gating
2. `src/features/dashboard/config/statsConfig.ts` - Add feature requirements
3. `src/features/dashboard/components/QuickStatsPanel.tsx` - Apply GatedStat
4. `src/features/dashboard/components/QuickActionsPanel.tsx` - Apply GatedAction
5. `src/features/dashboard/components/PerformanceOverviewCard.tsx` - Gate targets
6. `src/features/dashboard/components/KPIGridHeatmap.tsx` - Gate Financial Details

---

## Test Cases

### Free Tier User
- [ ] Can see dashboard header with time period controls
- [ ] Can see Commission, Pipeline stats
- [ ] Cannot see Expenses, Net Income, Breakeven, Policies Needed (shows "—" with lock)
- [ ] "Add Policy" button works
- [ ] "Add Expense" button shows upgrade prompt
- [ ] "View Reports" button shows upgrade prompt
- [ ] KPIGrid shows Policy Health, Client Details sections
- [ ] KPIGrid "Financial Details" section is gated with upgrade overlay
- [ ] PerformanceOverviewCard hides target column

### Starter Tier User
- [ ] All Free tier features unlocked
- [ ] Can see Expenses, Net Income, Breakeven, Policies Needed stats
- [ ] "Add Expense" button works
- [ ] "View Reports" button works
- [ ] KPIGrid "Financial Details" section visible
- [ ] PerformanceOverviewCard shows target column

### Pro/Team Tier User
- [ ] All Starter features unlocked
- [ ] Full targets with projections visible
- [ ] Export functionality available

---

## Implementation Order

1. **Create `useDashboardFeatures` hook** (defines what's available per tier)
2. **Create `GatedStat` component** (reusable locked stat display)
3. **Update `QuickStatsPanel`** with gating
4. **Create `GatedAction` component** (reusable locked button)
5. **Update `QuickActionsPanel`** with gating
6. **Update `PerformanceOverviewCard`** with targets gating
7. **Create `GatedKPISection` component**
8. **Update `KPIGridHeatmap`** with gating
9. **Integration testing** per tier
10. **Run typecheck and build**

---

## Notes

- Super admin emails bypass all gating (already implemented in RouteGuard)
- Grandfathered users should see full features until their period expires
- Visual approach: Show gated content with blur/overlay + upgrade CTA, not completely hidden
- Tooltip approach: Lock icon with "Upgrade to X to unlock Y" messaging
