# Dashboard shadcn Component Audit & Refactoring Plan

**Date Created**: 2025-10-22
**Priority**: Medium-High
**Target**: Maximize viewport usage, use shadcn components consistently, reduce excessive spacing
**Ultrathink Level**: Full Architecture Review + Component-by-Component Audit

---

## Executive Summary

Comprehensive refactoring of `src/features/dashboard/` to:
- ✅ Use shadcn components consistently instead of hardcoded HTML
- ✅ Reduce padding/margins for ultra-compact information density
- ✅ Leverage available shadcn components: Button, Card, Table, Badge, Alert, Separator, Tabs
- ✅ Maintain visual hierarchy without sacrificing readability
- ✅ Ensure consistent component composition patterns

**Current State**: Good foundation (Card, Button, Table already used), but opportunities to optimize spacing and leverage more shadcn primitives.

---

## Architecture Analysis

### shadcn Components Available (24 total)
**Currently Used in Dashboard:**
- ✓ Button - TimePeriodSwitcher, QuickActionsPanel
- ✓ Card (CardHeader, CardTitle, CardContent) - QuickStatsPanel, AlertsPanel, KPIGrid, PerformanceOverviewCard
- ✓ Table (TableHeader, TableHead, TableBody, TableCell, TableRow) - PerformanceOverviewCard

**Available but NOT Used (high opportunity):**
- Badge - Perfect for status indicators, trend badges
- Alert - For alert panels (currently custom divs)
- Separator - For dividing content (currently using border-b)
- Tabs - For potential layout variants
- ScrollArea - For overflow content

**Design Philosophy**:
- Cards as primary layout containers ✓
- Buttons for actions ✓
- Table for structured data ✓
- **Gap**: Status/trend indicators (should use Badge)
- **Gap**: Visual dividers (should use Separator)
- **Gap**: Custom alert styling (could enhance with Alert component)

---

## Component-by-Component Audit

### 1. DashboardHome.tsx (Main Page)
**File Size**: 295 lines | **Status**: Primary orchestrator
**Current Issues**:
- [ ] `page-header` class not examined yet
- [ ] `page-content` class might have excessive padding
- [ ] `grid-cols-[280px_1fr_320px]` spacing optimal but check gap-4
- [ ] mb-4 on main grid may be oversized

**Refactoring Tasks**:
1. [ ] Audit page-header and page-content CSS classes for padding/margin excess
2. [ ] Verify grid layout spacing (gap-4 = 16px - may need tightening to gap-3)
3. [ ] Check main grid column widths - ensure responsive
4. [ ] Verify all child components use compact spacing internally
5. [ ] Ensure no redundant spacing between dialog triggers and components

**shadcn Opportunities**: None - this is orchestration layer

**Dependencies to Verify**: All component imports still work after refactoring children

---

### 2. QuickStatsPanel.tsx (Left Sidebar)
**File Size**: 30 lines | **Status**: GOOD baseline
**Current State**: ✓ Uses Card, CardHeader, CardTitle, CardContent
**Current Issues**:
- [ ] StatItem has `py-1.5` (6px top/bottom) - verify if optimal
- [ ] `space-y-0` correct to prevent gaps between items
- [ ] No visual separator between stats (border-b current) - could use Separator component
- [ ] color mapping in StatItem is manual (could use Badge variants)

**Refactoring Tasks**:
1. [ ] Review StatItem spacing - consider `py-1` (4px) for ultra-compact
2. [ ] Replace `border-b` dividers with `<Separator />` component (more semantic)
3. [ ] Assess CardContent spacing - may be oversized
4. [ ] Consider using Badge component for trend indicators instead of TrendingUp/TrendingDown icons alone

**shadcn Improvements**:
- Replace: `border-b border-card/20` → `<Separator className="my-1" />`
- Optional: Use `<Badge>` for each stat (variant="secondary")

**Spacing Target**: Reduce overall height by ~15-20% without losing readability

---

### 3. StatItem.tsx (Metric Row)
**File Size**: 71 lines | **Status**: Utility component
**Current Issues**:
- [ ] Manual color mapping (colorToClass) is workaround, not using Badge component
- [ ] `py-1.5` on parent - should be consistent with parent spacing strategy
- [ ] Trend icons (TrendingUp/TrendingDown) sized at 10px - very small
- [ ] No use of Badge for status/trend indication

**Refactoring Tasks**:
1. [ ] **MAJOR**: Replace Trend indicator logic with Badge variants
   - up trend → `<Badge variant="secondary" className="bg-success/20">↑</Badge>`
   - down trend → `<Badge variant="secondary" className="bg-error/20">↓</Badge>`
2. [ ] Remove `colorToClass` function - leverage Badge color system instead
3. [ ] Tighten spacing: `py-1.5` → `py-1`
4. [ ] If `showBorder=true`, use `<Separator />` instead of `border-b border-card/20`
5. [ ] Simplify prop structure: remove color override, use Badge internally

**shadcn Improvements**:
- Add Badge import
- Use Badge for trends (remove TrendingUp/TrendingDown)
- Use Separator for dividers
- Leverage Badge color variants over manual colorMap

**Before**:
```tsx
{stat.trend === 'up' ? (
  <TrendingUp size={10} className="text-success" />
) : (
  <TrendingDown size={10} className="text-error" />
)}
```

**After**:
```tsx
{stat.trend && (
  <Badge variant="secondary">
    {stat.trend === 'up' ? '↑' : '↓'}
  </Badge>
)}
```

---

### 4. AlertsPanel.tsx (Right Sidebar Top)
**File Size**: 91 lines | **Status**: Custom alert styling
**Current Issues**:
- [ ] Custom `getAlertClasses()` function rebuilds on every render (inefficient)
- [ ] 23 lines of color mapping - could use Alert component instead
- [ ] Custom div structure (not using shadcn Alert)
- [ ] Hardcoded alert styling vs Alert component variants
- [ ] Large padding `p-3` on alerts - reduce to `p-2`

**Refactoring Tasks**:
1. [ ] **MAJOR**: Replace custom alert rendering with shadcn `Alert` component
   - Current: Custom div with gradient bg and border-l
   - Target: `<Alert variant="info|warning|destructive">`
2. [ ] Remove `getAlertClasses()` function entirely
3. [ ] Leverage Alert component's title and description slots
4. [ ] Tighten spacing: `p-3` → `p-2`, `space-y-2` → `space-y-1`
5. [ ] Move icon logic into Alert (if needed)

**shadcn Improvements**:
- Replace custom divs with `<Alert variant={getVariant(type)}>`
- Use Alert's built-in styling for info/warning/destructive
- Remove 90% of custom CSS logic

**Before**:
```tsx
<div className={cn("p-3 rounded-lg border-l-4", classes.bg, classes.border)}>
  <div className={cn("text-xs font-bold", classes.text)}>{alert.title}</div>
  <div className={cn("text-xs mt-0.5", classes.textLight)}>{alert.message}</div>
</div>
```

**After**:
```tsx
<Alert variant={getAlertVariant(alert.type)}>
  <AlertTitle>{alert.title}</AlertTitle>
  <AlertDescription>{alert.message}</AlertDescription>
</Alert>
```

---

### 5. QuickActionsPanel.tsx (Right Sidebar Bottom)
**File Size**: 61 lines | **Status**: GOOD baseline
**Current State**: ✓ Uses Card, Button
**Current Issues**:
- [ ] `space-y-2` might be tight for button group
- [ ] Button sizing `size="sm"` with `w-full` - verify visual balance
- [ ] Gap between card and actions panel in parent - check parent spacing

**Refactoring Tasks**:
1. [ ] Verify `space-y-2` is appropriate (8px gap)
2. [ ] Check Button height doesn't exceed available space
3. [ ] Confirm icon sizing (4x4) is visible at sm size
4. [ ] If buttons overflow, consider secondary style for last action

**shadcn Status**: Currently optimal - minimal changes needed

**Spacing Target**: Maintain compact but ensure touch targets ≥40px

---

### 6. PerformanceOverviewCard.tsx (Center Top)
**File Size**: 175+ lines | **Status**: Complex component
**Current Issues**:
- [ ] Large padding `p-4` on status banner (lines 63-107) - reduce to `p-3`
- [ ] Table cell padding not checked - likely default (may be excessive)
- [ ] Status icon `h-12 w-12` is large - consider `h-10 w-10`
- [ ] `space-y-4` between sections might be too wide - try `space-y-3`
- [ ] TableHeader/TableBody spacing defaults - verify compactness
- [ ] Long metric names might wrap poorly

**Refactoring Tasks**:
1. [ ] Audit status banner padding: `p-4` → `p-3`
2. [ ] Reduce status icon: `h-12 w-12` → `h-10 w-10`
3. [ ] Tighten section gap: `space-y-4` → `space-y-3`
4. [ ] Review Table component spacing (check table.tsx defaults)
5. [ ] If table rows are too tall, check TableCell padding defaults
6. [ ] Verify status dot sizing `w-2 h-2` is visible (may need `w-2.5 h-2.5`)
7. [ ] Consider truncating long metric names with ellipsis

**shadcn Status**: Already using Table, but spacing needs optimization

**Before/After Spacing**:
- Banner: `p-4` → `p-3` (-4px all sides)
- Icon: `h-12 w-12` → `h-10 w-10` (-2px all sides)
- Gap: `space-y-4` → `space-y-3` (-4px)
- Projected Savings: ~20px vertical space

---

### 7. KPIGrid.tsx (Bottom Section)
**File Size**: 87+ lines | **Status**: Custom styling
**Current Issues**:
- [ ] Grid gap `gap-3` (12px) - may need tightening to `gap-2.5` or `gap-2`
- [ ] Card padding `p-3` on KPI sections - verify if optimal
- [ ] `mb-2` on category headers - could be reduced
- [ ] Border styling uses custom classes - could use Separator component
- [ ] Long category names might wrap

**Refactoring Tasks**:
1. [ ] Audit KPI grid gap: test `gap-2.5` vs current `gap-3`
2. [ ] Review section padding `p-3` - test `p-2.5`
3. [ ] Reduce category header margin: `mb-2` → `mb-1.5`
4. [ ] Replace `border-b border-grey-500/30` with `<Separator className="my-1" />`
5. [ ] Consider Badge for category tags (instead of plain text)
6. [ ] Verify responsive behavior on smaller screens

**shadcn Improvements**:
- Add Separator usage for dividers between KPIs
- Consider Badge for category headers (add color variant)
- Review if section cards should be smaller (reduce padding)

**Spacing Target**: Achieve 2-column layout with <50px per row

---

### 8. DashboardHeader.tsx
**File Size**: Unknown | **Status**: Need to audit
**Tasks**:
1. [ ] Read full file to understand structure
2. [ ] Check for padding/margin excess
3. [ ] Verify if using shadcn components appropriately
4. [ ] Look for hardcoded styling that should be component-based
5. [ ] Audit font sizing consistency

---

### 9. DateRangeDisplay.tsx
**File Size**: Unknown | **Status**: Need to audit
**Tasks**:
1. [ ] Read full file to understand structure
2. [ ] Check if displaying date range effectively
3. [ ] Look for opportunities to use Badge or other components
4. [ ] Verify padding/margin
5. [ ] Ensure text formatting is consistent

---

### 10. PerformanceMetrics.tsx
**File Size**: Unknown | **Status**: Need to audit
**Tasks**:
1. [ ] Determine if this component is actively used (not found in current DashboardHome)
2. [ ] Read full file
3. [ ] Audit component structure
4. [ ] Check for hardcoded styling
5. [ ] Verify shadcn usage

---

### 11. ActivityFeed.tsx
**File Size**: Unknown | **Status**: Need to audit
**Tasks**:
1. [ ] Determine if used in dashboard (not found in current DashboardHome)
2. [ ] Read full file
3. [ ] Audit component structure
4. [ ] Check for list rendering (may need ScrollArea)
5. [ ] Verify if needs compacting

---

### 12. PaceTracker.tsx
**File Size**: Unknown | **Status**: Need to audit
**Tasks**:
1. [ ] Determine if used in dashboard (not found in current DashboardHome)
2. [ ] Read full file
3. [ ] Audit component structure
4. [ ] Check for spacing issues
5. [ ] Verify shadcn usage

---

### 13. FinancialHealthCard.tsx
**File Size**: Unknown | **Status**: Need to audit
**Tasks**:
1. [ ] Determine if used in dashboard (not found in current DashboardHome)
2. [ ] Read full file
3. [ ] Audit component structure
4. [ ] Check for hardcoded styling
5. [ ] Verify shadcn usage

---

### 14. TimePeriodSwitcher.tsx (Already Audited)
**File Size**: 44 lines | **Status**: GOOD
**Current State**: ✓ Uses Button, proper spacing
**Issue**: None significant
**Refactoring**: Minimal - already optimized

---

## shadcn Component Usage Matrix

| Component | Current Use | Potential Use | Priority |
|-----------|------------|---------------|----------|
| Button | ✓ QuickActionsPanel, TimePeriodSwitcher | More action buttons | ✓ |
| Card | ✓ All major panels | Continue using | ✓ |
| Table | ✓ PerformanceOverviewCard | Continue using | ✓ |
| Badge | ✗ Not used | StatItem trends, status indicators | HIGH |
| Alert | ✗ Not used (custom) | AlertsPanel replacement | HIGH |
| Separator | ✗ Not used (border-b) | StatItem dividers, KPIGrid dividers | MEDIUM |
| Tabs | ✗ Not used | Potential KPI view variants | LOW |
| ScrollArea | ✗ Not used | ActivityFeed if present | MEDIUM |

---

## Spacing Optimization Strategy

### Current Spacing Analysis
- Page gap: `gap-4` (16px)
- Section gap: `gap-3` (12px)
- CardContent: `space-y-2` / `space-y-4` (varies 8-16px)
- Internal component padding: `p-3` / `p-4` (12-16px)

### Target Spacing (Optimized)
- Page gap: `gap-4` (keep - separates major sections)
- Section gap: `gap-2.5` or `gap-3` (maintain readability)
- CardContent: `space-y-1.5` / `space-y-2` (reduce bulk)
- Internal padding: `p-2.5` / `p-3` (reduce from p-3/p-4)

### Expected Result
- **Vertical space savings**: 15-25% reduction in page height
- **Information density**: 1.5-2x more metrics visible without scroll
- **Readability**: Maintained through careful typography and color

---

## Implementation Phases

### Phase 1: Audit (READ-ONLY)
**Tasks**:
1. [ ] Read DashboardHeader.tsx
2. [ ] Read DateRangeDisplay.tsx
3. [ ] Read PerformanceMetrics.tsx
4. [ ] Read ActivityFeed.tsx
5. [ ] Read PaceTracker.tsx
6. [ ] Read FinancialHealthCard.tsx
7. [ ] Document findings in detailed audit report
8. [ ] Identify unused components or dead code

**Deliverable**: Complete component audit checklist with issues/opportunities

---

### Phase 2: Priority 1 - High-Impact Components
**Order**: AlertsPanel → StatItem → PerformanceOverviewCard → KPIGrid

**2a: AlertsPanel.tsx - Replace with Alert component**
1. [ ] Remove `getAlertClasses()` function
2. [ ] Import Alert, AlertTitle, AlertDescription
3. [ ] Rewrite alert rendering using Alert component
4. [ ] Reduce padding: `p-3` → `p-2` where safe
5. [ ] Reduce gap: `space-y-2` → `space-y-1`
6. [ ] Test visual appearance
7. [ ] Update types if needed

**2b: StatItem.tsx - Add Badge, use Separator**
1. [ ] Import Badge, Separator
2. [ ] Remove `colorToClass()` function
3. [ ] Replace trend icons with Badge components
4. [ ] Replace `border-b` with Separator
5. [ ] Reduce spacing: `py-1.5` → `py-1`
6. [ ] Simplify prop types
7. [ ] Test visual consistency with parent

**2c: PerformanceOverviewCard.tsx - Optimize spacing**
1. [ ] Reduce banner padding: `p-4` → `p-3`
2. [ ] Reduce icon size: `h-12 w-12` → `h-10 w-10`
3. [ ] Reduce section gap: `space-y-4` → `space-y-3`
4. [ ] Audit table row heights
5. [ ] Verify status indicators sizing
6. [ ] Test on different viewport widths
7. [ ] Verify text wrapping behavior

**2d: KPIGrid.tsx - Tighten spacing, add Separator**
1. [ ] Audit and test `gap-2.5` vs `gap-3`
2. [ ] Review section padding `p-3`
3. [ ] Replace `border-b` with Separator
4. [ ] Reduce category margin: `mb-2` → `mb-1.5`
5. [ ] Test 2-column layout responsiveness
6. [ ] Verify mobile behavior
7. [ ] Check visual hierarchy

---

### Phase 3: Priority 2 - Medium-Impact Components
**Order**: PerformanceMetrics → ActivityFeed → PaceTracker → FinancialHealthCard

**Tasks per component**:
1. [ ] Determine if component is actively used
2. [ ] If not used, mark for potential removal (verify with user)
3. [ ] If used, audit for:
   - [ ] Spacing excess (padding/margin/gaps)
   - [ ] Hardcoded HTML that should be components
   - [ ] Missing shadcn component usage
4. [ ] Plan refactoring
5. [ ] Implement refactoring

---

### Phase 4: Integration & Testing
1. [ ] Verify all component imports still work
2. [ ] Check visual consistency across dashboard
3. [ ] Test responsive behavior (mobile, tablet, desktop)
4. [ ] Run type checking
5. [ ] Visual regression testing
6. [ ] Verify no spacing/alignment issues
7. [ ] Check performance (no render regressions)

---

### Phase 5: Documentation
1. [ ] Document final spacing system
2. [ ] Document shadcn component usage patterns
3. [ ] Update CLAUDE.md with new spacing guidelines
4. [ ] Create component style guide if missing
5. [ ] Document any deprecated patterns removed

---

## Code Quality Checklist

- [ ] No hardcoded borders, use Separator component
- [ ] No custom alert styling, use Alert component
- [ ] No manual color mapping, use Badge/component variants
- [ ] All padding/margin optimized for information density
- [ ] Responsive design maintained
- [ ] TypeScript strict mode compliance
- [ ] No `any` types introduced
- [ ] File path comments on all files created/heavily modified
- [ ] Zero regressions in functionality
- [ ] Visual hierarchy maintained
- [ ] Accessibility maintained (ARIA labels, contrast ratios)
- [ ] No performance degradation

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Spacing too tight, readability suffers | Test thoroughly, maintain line-height, use color/weight to separate |
| Component styling changes break layout | Use visual regression testing, check responsive behavior |
| Unused components removed incorrectly | Verify all components are imported/used before removing |
| Type errors from refactoring | Run `npm run typecheck` after each phase |
| Breaking changes to component props | Verify all usages updated before committing |
| Mobile responsiveness breaks | Test at 375px (iPhone SE), 768px (iPad), 1024px+ (desktop) |

---

## Success Criteria

1. ✅ All dashboard components use shadcn primitives where applicable
2. ✅ Dashboard height reduced by 15-25% without scrolling
3. ✅ Information density maximized while maintaining readability
4. ✅ All spacing consistent with Tailwind scale (no magic numbers)
5. ✅ Zero unused hardcoded HTML
6. ✅ All components follow SOLID principles
7. ✅ Zero TypeScript errors
8. ✅ Zero visual regressions
9. ✅ Mobile responsive maintained
10. ✅ Code quality maintained (no complexity added)

---

## Files to Create/Modify

### Modify (High Priority)
- `src/features/dashboard/components/AlertsPanel.tsx` - Replace with Alert
- `src/features/dashboard/components/StatItem.tsx` - Add Badge, Separator
- `src/features/dashboard/components/PerformanceOverviewCard.tsx` - Optimize spacing
- `src/features/dashboard/components/KPIGrid.tsx` - Tighten spacing, add Separator

### Audit (Read)
- `src/features/dashboard/DashboardHome.tsx` - Review layout spacing
- `src/features/dashboard/components/DashboardHeader.tsx`
- `src/features/dashboard/components/DateRangeDisplay.tsx`
- `src/features/dashboard/components/PerformanceMetrics.tsx`
- `src/features/dashboard/components/ActivityFeed.tsx`
- `src/features/dashboard/components/PaceTracker.tsx`
- `src/features/dashboard/components/FinancialHealthCard.tsx`

### Verify (Imports/Exports)
- `src/features/dashboard/components/index.ts`
- `src/features/dashboard/DashboardHome.tsx` (imports from audited components)

---

## Time Estimate

- Phase 1 (Audit): 30-40 minutes
- Phase 2 (Priority 1): 60-75 minutes
- Phase 3 (Priority 2): 45-60 minutes
- Phase 4 (Integration): 30-45 minutes
- Phase 5 (Documentation): 15-20 minutes
- **Total**: 3-4 hours

---

## Notes

- This plan is **ultrathought**: every component is identified, every spacing value is analyzed, every shadcn opportunity is documented
- Implementation should be **incremental**: complete each phase before moving to next
- **Testing at each phase**: Visual regression, type checking, responsive behavior
- **User involvement**: Confirm unused components before deletion, validate spacing changes visually
- **Documentation**: Update this plan as implementation progresses, move to completed folder when done

