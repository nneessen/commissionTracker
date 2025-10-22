# Dashboard shadcn Component Audit & Refactoring - CORRECTED PLAN

**Date Created**: 2025-10-22
**Goal**: Replace ALL hardcoded HTML with shadcn components where available
**Ultrathink Level**: Complete - All issues identified

---

## Critical Understanding

**User Requirement**: "I want everything that is using a non-shadcn component to use a shadcn component if it can be."

**Discovered Reality**:
- Card, Button, Table components are HEAVILY CUSTOMIZED with brand colors (correct to use)
- Alert, Badge, Separator are DEFAULT shadcn (need brand color overrides to match)
- Many components use hardcoded divs instead of available shadcn primitives

---

## shadcn Components Audit

### ✅ Already Using Correctly
1. **Card** (CardHeader, CardTitle, CardContent) - Customized with brand, used in:
   - QuickStatsPanel
   - AlertsPanel
   - QuickActionsPanel
   - PerformanceOverviewCard
   - KPIGrid
   - ActivityFeed (legacy)
   - PerformanceMetrics (legacy)

2. **Button** - Customized with brand, used in:
   - QuickActionsPanel
   - TimePeriodSwitcher

3. **Table** (TableHeader, TableHead, TableBody, TableRow, TableCell) - Default, used in:
   - PerformanceOverviewCard

### ❌ Available but NOT Used (Need to Add)

4. **Badge** - Available at `src/components/ui/badge.tsx`
   - **Current**: Hardcoded rank badges in PerformanceMetrics (lines 156-162, 203-208)
   - **Current**: Hardcoded status badges in ActivityFeed (lines 156-163)
   - **Current**: Hardcoded product badge in ActivityFeed (line 112)
   - **Replacement**: `<Badge variant="secondary" className="bg-accent-green/20">text</Badge>`

5. **Alert** (Alert, AlertTitle, AlertDescription) - Available at `src/components/ui/alert.tsx`
   - **Current**: AlertsPanel uses custom divs (lines 70-84)
   - **Current**: PerformanceOverviewCard status banner is custom div (lines 63-107)
   - **Replacement**: Must override with brand colors to match

6. **Separator** - Available at `src/components/ui/separator.tsx`
   - **Current**: StatItem uses `border-b border-card/20` (line 46)
   - **Current**: KPIGrid uses `border-b border-grey-500/30` (line 71)
   - **Current**: ActivityFeed uses `border-b border-border` (lines 85, 128)
   - **Replacement**: `<Separator className="bg-grey-500/30" />`

### ⚠️ Additional shadcn Components Available (Check Usage)

7. **Empty** - Available at `src/components/ui/empty.tsx`
   - **Current**: ActivityFeed empty state uses custom div (lines 71-79)
   - **Check**: Read empty.tsx to see if it matches use case

8. **Tabs** - Available at `src/components/ui/tabs.tsx`
   - **Potential**: Could use for different KPI views (not currently needed)

---

## Component-by-Component Refactoring Plan

### PRIORITY 1: Active Dashboard Components

#### 1. AlertsPanel.tsx
**Current State**: Custom alert divs with gradient backgrounds (lines 70-84)
**shadcn Opportunity**: Use Alert component with brand overrides

**Changes**:
```tsx
// Import
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Replace custom div with:
<Alert className={cn(
  "border-l-4",
  alert.type === 'info' && "bg-gradient-to-r from-accent-blue/20 to-accent-blue/10 border-l-accent-blue",
  alert.type === 'warning' && "bg-gradient-to-r from-accent-yellow/20 to-accent-orange/10 border-l-accent-yellow",
  alert.type === 'danger' && "bg-gradient-to-r from-accent-red/20 to-accent-red/10 border-l-accent-red"
)}>
  <AlertTitle className={getAlertTitleColor(alert.type)}>{alert.title}</AlertTitle>
  <AlertDescription className={getAlertDescColor(alert.type)}>{alert.message}</AlertDescription>
</Alert>
```

**Benefits**:
- Semantic HTML (proper ARIA roles)
- More maintainable
- Removes custom getAlertClasses function
- Still matches brand colors

---

#### 2. StatItem.tsx
**Current State**: Manual border dividers, TrendingUp/Down icons (lines 42-69)
**shadcn Opportunity**: Use Separator and Badge

**Changes**:
```tsx
// Import
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// Replace border-b with:
{showBorder && <Separator className="bg-card/20 my-1.5" />}

// Optional: Replace trend icons with Badge
{stat.trend && (
  <Badge variant="secondary" className={cn(
    "text-xs px-1.5",
    stat.trend === 'up' && "bg-success/20 text-success",
    stat.trend === 'down' && "bg-error/20 text-error"
  )}>
    {stat.trend === 'up' ? '↑' : '↓'}
  </Badge>
)}
```

**Benefits**:
- Semantic separator component
- Badge provides better accessibility
- Consistent with shadcn patterns

---

#### 3. KPIGrid.tsx
**Current State**: Border dividers (line 71)
**shadcn Opportunity**: Use Separator

**Changes**:
```tsx
// Import
import { Separator } from '@/components/ui/separator';

// Replace border-b with:
{kpiIndex < section.kpis.length - 1 && (
  <Separator className="bg-grey-500/30 my-1.5" />
)}
```

---

#### 4. PerformanceOverviewCard.tsx
**Current State**:
- Status banner custom div (lines 63-107)
- Status dot indicators (lines 154-165)

**shadcn Opportunity**:
- Use Alert for status banner
- Use Badge for status dots

**Changes**:

**Status Banner**:
```tsx
// Import
import { Alert } from '@/components/ui/alert';

// Replace custom div (lines 63-107) with:
<Alert className={cn(
  "border-l-4",
  isBreakeven
    ? "bg-gradient-to-r from-accent-green/20 to-accent-green/10 border-l-accent-green"
    : "bg-gradient-to-r from-accent-orange/20 to-accent-orange/10 border-l-accent-orange"
)}>
  <div className="flex items-center gap-4">
    <div className={cn(
      "h-10 w-10 rounded-full flex items-center justify-center",
      isBreakeven
        ? "bg-gradient-to-br from-accent-green-light to-accent-green"
        : "bg-gradient-to-br from-accent-yellow-light to-accent-orange"
    )}>
      {isBreakeven ? (
        <CheckCircle className="h-5 w-5 text-grey-900" />
      ) : (
        <AlertCircle className="h-5 w-5 text-grey-900" />
      )}
    </div>
    <div className="flex-1">
      <div className={cn(
        "text-sm font-bold",
        isBreakeven ? "text-accent-green-light" : "text-accent-yellow-light"
      )}>
        {isBreakeven ? `✓ Above Breakeven (${periodLabel})` : `⚠ Below Breakeven (${periodLabel})`}
      </div>
      <div className={cn(
        "text-xs font-medium mt-0.5",
        isBreakeven ? "text-accent-green-light" : "text-accent-yellow-light"
      )}>
        {isBreakeven
          ? `${periodLabel} surplus of ${formatCurrency(Math.abs(surplusDeficit))}`
          : `Need ${formatCurrency(breakevenDisplay)}${periodSuffix.toLowerCase()} (${Math.ceil(policiesNeeded)} policies)`}
      </div>
    </div>
  </div>
</Alert>
```

**Status Dots** (use Badge):
```tsx
// Import
import { Badge } from '@/components/ui/badge';

// Replace status dot (lines 154-165) with:
{row.showTarget && (
  <Badge variant="outline" className={cn(
    "w-2 h-2 p-0 rounded-full border-0",
    status.toUpperCase() === "HIT" && "bg-success",
    status.toUpperCase() === "GOOD" && "bg-info",
    status.toUpperCase() === "FAIR" && "bg-warning",
    status.toUpperCase() === "POOR" && "bg-error",
    status.toUpperCase() === "NEUTRAL" && "bg-muted-foreground"
  )} />
)}
```

---

#### 5. DashboardHeader.tsx
**Current State**: Hardcoded div with border (line 17)
**shadcn Opportunity**: Use Separator

**Changes**:
```tsx
// Import
import { Separator } from '@/components/ui/separator';

// After the header content, replace border-b with:
<div className="mb-4 pb-3">
  <div className="flex justify-between items-center">
    {/* existing content */}
  </div>
  <Separator className="mt-3" />
</div>
```

---

#### 6. DateRangeDisplay.tsx
**Current State**: Hardcoded badge-like div (line 35)
**shadcn Opportunity**: Use Badge

**Changes**:
```tsx
// Import
import { Badge } from '@/components/ui/badge';

// Replace entire div with:
<div className="flex items-center gap-2">
  <Badge variant="secondary" className="bg-muted/20 text-foreground hover:bg-muted/20 text-sm font-medium px-3 py-1.5">
    {getPeriodDescription(timePeriod)}
  </Badge>
  <span className="text-muted-foreground/60">•</span>
  <Badge variant="outline" className="text-muted-foreground text-sm font-medium">
    {formatDateRange(dateRange)}
  </Badge>
</div>
```

---

### PRIORITY 2: Legacy Components (If Keeping)

#### 7. ActivityFeed.tsx
**shadcn Opportunities**:
1. Empty state (lines 71-79) - Check if Empty component matches
2. Rank badges (line 112) - Use Badge component
3. Status badges (lines 156-163) - Use Badge component
4. Border separators (lines 85, 128) - Use Separator

**Changes**:

**Empty State** (after reading empty.tsx):
```tsx
// Import
import { Empty } from '@/components/ui/empty';

// Replace custom empty div with Empty if it matches
```

**Product Badge** (line 112):
```tsx
<Badge variant="outline" className="text-xs bg-card">
  {formatProductName(policy.product)}
</Badge>
```

**Status Badge** (lines 156-163):
```tsx
<Badge variant="secondary" className={cn(
  commission.status === "paid"
    ? "bg-green-100 text-green-700"
    : "bg-blue-100 text-blue-700"
)}>
  {commission.status}
</Badge>
```

**Separators** (lines 85, 128):
```tsx
<Separator className="mb-3 mt-2" />
```

---

#### 8. PerformanceMetrics.tsx
**shadcn Opportunities**:
1. Rank badges (lines 156-162, 203-208) - Use Badge
2. Metric cards (lines 93-134) - Could be Card components
3. Border separators - Use Separator if any exist

**Changes**:

**Rank Badges**:
```tsx
<Badge className={cn(
  "w-6 h-6 rounded-md flex items-center justify-center",
  getRankBadgeClass(index)
)}>
  {index + 1}
</Badge>
```

**Metric Cards** (lines 93-134):
```tsx
// Each metric could be a Card:
<Card className="bg-gradient-to-br from-blue-50 to-blue-100">
  <CardContent className="p-4">
    <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
      Total Policies
    </div>
    <div className="text-3xl font-bold text-foreground">
      {totalPolicies}
    </div>
  </CardContent>
</Card>
```

---

### PRIORITY 3: Spacing Optimization

After converting to shadcn components, optimize spacing:

1. **Override CardContent padding**: `className="p-3"` (was defaulting to p-5)
   - QuickStatsPanel
   - AlertsPanel
   - KPIGrid
   - PerformanceOverviewCard

2. **Tighten gaps**:
   - PerformanceOverviewCard: `space-y-4` → `space-y-3`
   - KPIGrid: `gap-3` → `gap-2.5`
   - AlertsPanel: `space-y-2` → `space-y-1`

3. **Reduce component-specific padding**:
   - PerformanceOverviewCard banner: `p-4` → `p-3`
   - PerformanceOverviewCard icon: `h-12 w-12` → `h-10 w-10`
   - Alert components: ensure `p-3` or `p-2.5` max

---

## Implementation Phases

### Phase 1: Read Empty Component (Validation)
**Task**: Read `src/components/ui/empty.tsx` to verify it matches ActivityFeed use case

**Decision Point**: If Empty component is appropriate, use it. Otherwise, keep custom.

---

### Phase 2: Active Components (Priority Order)
1. **StatItem.tsx** - Add Badge, Separator (simple, low risk)
2. **KPIGrid.tsx** - Add Separator (simple)
3. **DashboardHeader.tsx** - Add Separator (simple)
4. **DateRangeDisplay.tsx** - Convert to Badge (moderate)
5. **AlertsPanel.tsx** - Convert to Alert component (moderate risk)
6. **PerformanceOverviewCard.tsx** - Convert banner to Alert, dots to Badge (complex)

---

### Phase 3: Legacy Components (If User Confirms Keeping)
1. **ActivityFeed.tsx** - Add Badge, Separator, optionally Empty
2. **PerformanceMetrics.tsx** - Convert rank badges to Badge, wrap metrics in Card

---

### Phase 4: Spacing Optimization
1. Override all CardContent with `className="p-3"`
2. Tighten gaps globally
3. Test visual appearance
4. Adjust as needed

---

### Phase 5: Testing & Validation
1. Visual regression testing
2. Responsive behavior testing
3. Type checking (`npm run typecheck`)
4. Accessibility check (ARIA roles)
5. Verify no shadcn components are hardcoded HTML

---

## Files to Modify

### Active Dashboard (Must Do)
1. `src/features/dashboard/components/StatItem.tsx`
2. `src/features/dashboard/components/KPIGrid.tsx`
3. `src/features/dashboard/components/DashboardHeader.tsx`
4. `src/features/dashboard/components/DateRangeDisplay.tsx`
5. `src/features/dashboard/components/AlertsPanel.tsx`
6. `src/features/dashboard/components/PerformanceOverviewCard.tsx`
7. `src/features/dashboard/DashboardHome.tsx` (verify Card padding overrides)

### Legacy Components (If Keeping)
8. `src/features/dashboard/components/ActivityFeed.tsx`
9. `src/features/dashboard/components/PerformanceMetrics.tsx`
10. `src/features/dashboard/components/PaceTracker.tsx`
11. `src/features/dashboard/components/FinancialHealthCard.tsx`

### Need to Read First
- `src/components/ui/empty.tsx` - Check if matches ActivityFeed use case

---

## Expected Results

### Before
- Hardcoded divs with manual styling
- Inconsistent border/separator implementation
- Custom badge-like divs
- No semantic HTML structure
- CardContent default p-5 padding

### After
- All available shadcn components used
- Semantic HTML (Alert, Badge, Separator)
- Consistent brand color overrides
- Better accessibility (ARIA roles from Alert)
- Optimized spacing (p-3 CardContent)
- 15-20% vertical space reduction
- 1.3-1.5x information density

---

## Success Criteria

✅ ZERO hardcoded HTML where shadcn component exists
✅ ALL borders use Separator component
✅ ALL badge-like divs use Badge component
✅ ALL alert-like divs use Alert component
✅ Brand colors maintained with className overrides
✅ No visual regressions
✅ Type checking passes
✅ Responsive behavior maintained
✅ Accessibility improved (semantic HTML)
✅ Spacing optimized (15-20% reduction)

---

## Time Estimate

- Phase 1 (Read Empty): 5 minutes
- Phase 2 (Active Components): 90-120 minutes
- Phase 3 (Legacy Components): 60-75 minutes
- Phase 4 (Spacing Optimization): 30-45 minutes
- Phase 5 (Testing): 30-45 minutes
- **Total**: 3.5-5 hours (depending on legacy scope)

---

## Questions for User

1. **Legacy Components**: Should I refactor ActivityFeed, PerformanceMetrics, PaceTracker, FinancialHealthCard? Or delete them?

2. **Spacing Aggressiveness**: Go for maximum density (p-2.5, tight gaps) or moderate (p-3, balanced gaps)?

3. **Empty Component**: Should I use Empty component if it matches, or keep custom empty states?

