# Continuation Prompt: Dashboard Redesign with Zinc Palette

## Task
Redesign the Dashboard page to match the consistent zinc palette styling used across Admin, Settings, Training Hub, Messages, Recruiting, Team, and Policies pages.

## Context
We've been systematically updating all pages to use a consistent compact design pattern with the zinc color palette. The following pages have been completed:
- Admin pages
- Settings pages
- Training Hub
- Messages page
- Recruiting page
- Team/Hierarchy page
- Policies page (just completed)

## Design Patterns to Follow

### Container
```tsx
className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950"
```

### Header Card
```tsx
className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800"
```

### Header Title
```tsx
<Icon className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
<h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Page Title</h1>
```

### Inline Stats with Dividers
```tsx
<div className="flex items-center gap-3 text-[11px]">
  <div className="flex items-center gap-1">
    <span className="font-medium text-zinc-900 dark:text-zinc-100">{value}</span>
    <span className="text-zinc-500 dark:text-zinc-400">label</span>
  </div>
  <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
  <!-- more stats -->
</div>
```

### Custom Tab Bar (if needed)
```tsx
<div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5">
  <button className={cn(
    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all",
    isActive
      ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
  )}>
    <Icon className="h-3.5 w-3.5" />
    {label}
  </button>
</div>
```

### Content Container / Card
```tsx
className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
```

### Compact Buttons
```tsx
// Primary action
className="h-6 text-[10px] px-2"

// Ghost/secondary
className="h-6 text-[10px] px-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"

// Icon only
className="h-6 w-6 p-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
```

### Table Styling
```tsx
// Header row
<TableRow className="h-8 border-b border-zinc-200 dark:border-zinc-800">
  <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">

// Body row
<TableRow className={cn(
  "h-9 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800/50",
  isSelected ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
)}>
  <TableCell className="text-[11px] text-zinc-900 dark:text-zinc-100 py-1.5">
```

### Section Headers (for panels/cards)
```tsx
<div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
  Section Title
</div>
```

### Empty States
```tsx
<div className="flex flex-col items-center justify-center p-4">
  <Icon className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Message</p>
  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Subtitle</p>
</div>
```

### Status Badges
```tsx
// Success/Active
className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded"

// Warning/Pending
className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded"

// Error/Cancelled
className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded"

// Info/Processing
className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded"
```

### Status Indicator Dots
```tsx
<div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />  // success
<div className="w-1.5 h-1.5 rounded-full bg-amber-500" />    // warning
<div className="w-1.5 h-1.5 rounded-full bg-red-500" />      // error
<div className="w-1.5 h-1.5 rounded-full bg-blue-500" />     // info
```

## Color Mapping Reference
| Old (Semantic) | New (Zinc) |
|----------------|------------|
| `text-foreground` | `text-zinc-900 dark:text-zinc-100` |
| `text-muted-foreground` | `text-zinc-500 dark:text-zinc-400` |
| `bg-card` | `bg-white dark:bg-zinc-900` |
| `bg-muted` | `bg-zinc-100 dark:bg-zinc-800` |
| `bg-muted/20` or `bg-muted/30` | `bg-zinc-50 dark:bg-zinc-800/50` |
| `border-border` | `border-zinc-200 dark:border-zinc-800` |
| `hover:bg-muted/50` | `hover:bg-zinc-50 dark:hover:bg-zinc-800/50` |
| `text-success` | `text-emerald-600 dark:text-emerald-400` |
| `text-error` or `text-destructive` | `text-red-600 dark:text-red-400` |
| `text-warning` | `text-amber-600 dark:text-amber-400` |
| `text-info` | `text-blue-600 dark:text-blue-400` |
| `bg-success` | `bg-emerald-500` |
| `bg-error` | `bg-red-500` |
| `bg-warning` | `bg-amber-500` |
| `bg-info` | `bg-blue-500` |

## Files to Update
The dashboard feature is located at `src/features/dashboard/`. Key files:

### Main Container
- `DashboardHome.tsx` - Main dashboard container with layout

### Components (in order of priority)
1. `components/QuickStatsPanel.tsx` - Left sidebar stats panel
2. `components/StatItem.tsx` - Individual stat item component
3. `components/PerformanceOverviewCard.tsx` - Center performance table
4. `components/AlertsPanel.tsx` - Alerts notification panel
5. `components/QuickActionsPanel.tsx` - Quick action buttons
6. `components/KPIGridHeatmap.tsx` - Main KPI grid
7. `components/TimePeriodSwitcher.tsx` - Time period tab switcher
8. `components/PeriodNavigator.tsx` - Period navigation arrows
9. `components/DateRangeDisplay.tsx` - Date range display badge
10. `components/DashboardHeader.tsx` - Dashboard header (if used)
11. `components/KPIGrid.tsx` - Alternate KPI grid layout
12. `components/KPIGridMatrix.tsx` - Matrix KPI layout
13. `components/KPIGridNarrative.tsx` - Narrative KPI layout
14. `components/FinancialHealthCard.tsx` - Financial health display
15. `components/PaceTracker.tsx` - Pace tracking component
16. `components/PerformanceMetrics.tsx` - Performance metrics display
17. `components/SkeletonLoaders.tsx` - Loading skeletons
18. `components/ActivityFeed.tsx` - Activity feed component
19. `components/KPILayoutSwitcher.tsx` - KPI layout toggle

### Sub-components
20. `components/kpi-layouts/CircularGauge.tsx`
21. `components/kpi-layouts/NarrativeInsight.tsx`
22. `components/kpi-layouts/MiniSparkline.tsx`

## Instructions
1. First explore `src/features/dashboard/` to understand the current structure
2. Start with `DashboardHome.tsx` to update the main container
3. Update each component systematically, replacing:
   - `Card` components with direct div styling using zinc colors
   - `text-foreground` → `text-zinc-900 dark:text-zinc-100`
   - `text-muted-foreground` → `text-zinc-500 dark:text-zinc-400`
   - `bg-muted/*` → `bg-zinc-50 dark:bg-zinc-800/50` or similar
   - Semantic colors (success, warning, error, info) → explicit colors (emerald, amber, red, blue)
   - `border-border` → `border-zinc-200 dark:border-zinc-800`
4. Remove unused Card/semantic color imports
5. Ensure consistent spacing: compact padding (p-2, p-3), small gaps (gap-2, gap-3)
6. Use 10-11px text sizes for content, 9-10px for labels
7. Run `npm run typecheck` after all changes to verify no errors
8. Use `/autocommit` when complete

## Reference Files (already updated)
- `src/features/policies/PolicyList.tsx` - Table styling, metrics bar, filters
- `src/features/policies/PolicyDashboard.tsx` - Container styling
- `src/features/hierarchy/HierarchyDashboardCompact.tsx` - Header, tabs, layout
- `src/features/hierarchy/components/AgentTable.tsx` - Table styling
- `src/features/messages/MessagesPage.tsx` - Panels, lists
- `src/features/recruiting/RecruitingDashboard.tsx` - Cards, stepper
- `src/features/settings/SettingsDashboard.tsx` - Forms, sections
