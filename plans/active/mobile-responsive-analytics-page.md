# Mobile Responsiveness for Analytics Page

## Context
Continuation of dashboard mobile responsiveness work. The Dashboard page responsive styles were completed in commit `b343796`. Now applying the same treatment to the Analytics page.

## Files to Modify

### 1. `src/features/analytics/AnalyticsDashboard.tsx`
**Header Card (lines 99-139):**
- Remove "Analytics" title and icon on mobile (hidden `sm:flex`)
- Remove "Performance metrics and insights" subtitle on mobile (hidden `sm:inline`)
- Stack header layout: `flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`
- On mobile, only show: TimePeriodSelector + CSV/PDF buttons
- Reduce padding on mobile: `px-2 sm:px-3`, `p-2 sm:p-3`

**Current header structure:**
```tsx
<div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border...">
  <div className="flex items-center gap-2">
    <BarChart3 className="h-4 w-4..." />
    <h1>Analytics</h1>
    <span>Performance metrics and insights</span>
  </div>
  <div className="flex items-center gap-3">
    <TimePeriodSelector />
    <div className="flex gap-1.5">CSV | PDF</div>
  </div>
</div>
```

**Target mobile-first structure:**
```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 rounded-lg px-2 sm:px-3 py-2 border...">
  <div className="hidden sm:flex items-center gap-2">
    <BarChart3 />
    <h1>Analytics</h1>
    <span className="hidden md:inline">Performance metrics and insights</span>
  </div>
  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
    <TimePeriodSelector />
    <div className="flex gap-1.5">CSV | PDF</div>
  </div>
</div>
```

**Main container (line 97):**
- Reduce padding on mobile: `p-2 sm:p-3`
- Reduce spacing: `space-y-2 sm:space-y-2.5`

### 2. `src/features/analytics/components/TimePeriodSelector.tsx`
**Button row (lines 190-212):**
The 7 period buttons (MTD, YTD, 30D, 60D, 90D, 12M, Custom) need to handle overflow on mobile.

Options:
- Reduce button padding on mobile: `px-1.5 sm:px-2`
- Reduce font size on mobile: `text-[9px] sm:text-[10px]`
- Allow horizontal scroll on very small screens: `overflow-x-auto`
- Abbreviate "Custom" to "..." on mobile with tooltip

Recommended approach:
```tsx
<div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5 overflow-x-auto">
  {periods.map(({ value, label }) => (
    <button
      className={cn(
        "px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] font-medium rounded transition-all whitespace-nowrap",
        // ... existing styles
      )}
    >
      {/* On very small screens, use shorter labels */}
      <span className="sm:hidden">{label === "Custom" ? "..." : label}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  ))}
</div>
```

### 3. Component Internal Grids (Check Each)

**Components to review for internal responsive grids:**
- `GamePlan.tsx` - Has tables that may need horizontal scroll
- `ProductMatrix.tsx` - Likely has grid layouts
- `ClientSegmentation.tsx` - May have card grids
- `CommissionPipeline.tsx` - Already lazy loaded
- `CarriersProductsBreakdown.tsx` - May have internal grids
- `GeographicAnalysis.tsx` - Contains USMap visualization
- `PaceMetrics.tsx` - Mostly flex-based, should be fine
- `PolicyStatusBreakdown.tsx` - Check for grids
- `PredictiveAnalytics.tsx` - Check for grids

**Pattern to apply where needed:**
```tsx
// For grids that show 2-3 columns on desktop:
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3

// For tables, add horizontal scroll wrapper:
<div className="overflow-x-auto">
  <Table className="min-w-[400px]">...</Table>
</div>
```

## Implementation Order

1. Update `AnalyticsDashboard.tsx` header and container
2. Update `TimePeriodSelector.tsx` for mobile overflow
3. Review and update individual component grids as needed
4. Run `npm run typecheck` to verify no breaking changes
5. Run `npm run build` to confirm build success

## Design Guidelines

Follow existing patterns from Dashboard responsive work:
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Mobile-first approach (base styles for mobile, add responsive overrides)
- Keep compact styling per `ui_style_preferences` memory
- No breaking code changes - CSS/styling only
- Test that functionality remains intact at all breakpoints

## Breakpoints Reference
- Mobile: < 640px (base styles)
- `sm:` 640px+
- `md:` 768px+
- `lg:` 1024px+
- `xl:` 1280px+
- `2xl:` 1536px+

## Verification Steps
1. `npm run typecheck` - Must pass
2. `npm run build` - Must pass
3. Visual check at mobile, tablet, desktop sizes
