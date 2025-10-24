# Layout & Sidebar Dense Redesign Plan

**Created**: 2025-01-23
**Status**: ACTIVE
**Purpose**: Redesign layout/sidebar components to match dense dashboard aesthetic and clean up component organization

---

## 🎯 Goals & Objectives

1. **Create cohesive dense layout system** matching dashboard's high-density design
2. **Clean up component organization** - remove unused folders, reorganize misplaced components
3. **Properly implement custom_ui** as shadcn component overrides (not random custom components)
4. **Unified design language** across all layout elements
5. **Maintain zero local storage** and TypeScript strict compliance

---

## 🔍 Current State Analysis

### Problems Identified

#### 1. Unused Components
- `src/components/dashboard/` folder contains 3 unused components:
  - ActionableInsights.tsx
  - CommissionPipeline.tsx
  - PerformanceMetricCard.tsx
  - ❌ These are NOT imported anywhere - DELETE entire folder

#### 2. Misused custom_ui Folder
- Currently contains random custom components, NOT shadcn overrides:
  - ✅ Used: EmailIcon, heading, stat-card, MetricTooltip, DataTable, TimePeriodSelector
  - ❌ Unused: ChartCard, InfoButton, MetricsCard
  - **Problem**: These should be in appropriate feature folders or src/components/shared/

#### 3. Inconsistent Layout Styling
- Current layout uses loose spacing (24px padding)
- Sidebar at 240px is too wide for dense layout
- No unified dense layout wrapper
- Settings layout doesn't match dense aesthetic

#### 4. Multiple Layout Style Definitions
- Styles scattered across:
  - src/index.css (legacy layout styles)
  - src/styles/dashboard-density.css (new dense styles)
  - Inline styles in components
  - No single source of truth

---

## 📋 Detailed Task Breakdown

### Phase 1: Cleanup & Reorganization

#### Task 1.1: Delete Unused Components
```bash
rm -rf src/components/dashboard/
```

#### Task 1.2: Reorganize custom_ui Components
Move used components to proper locations:
```
src/components/custom_ui/EmailIcon.tsx → src/features/auth/components/EmailIcon.tsx
src/components/custom_ui/heading.tsx → src/components/shared/Heading.tsx
src/components/custom_ui/stat-card.tsx → src/components/shared/StatCard.tsx
src/components/custom_ui/MetricTooltip.tsx → src/components/ui/MetricTooltip.tsx (already exists)
src/components/custom_ui/DataTable.tsx → src/components/shared/DataTable.tsx
src/components/custom_ui/TimePeriodSelector.tsx → src/features/analytics/components/TimePeriodSelector.tsx
```

Delete unused:
```bash
rm src/components/custom_ui/ChartCard.tsx
rm src/components/custom_ui/InfoButton.tsx
rm src/components/custom_ui/MetricsCard.tsx
```

#### Task 1.3: Update All Imports
Fix all import paths after reorganization

### Phase 2: Dense Layout System

#### Task 2.1: Create Dense Layout CSS
Create `src/styles/layout-dense.css`:
```css
/* Dense Layout System */
:root {
  /* Layout dimensions */
  --layout-sidebar-expanded: 220px;
  --layout-sidebar-collapsed: 72px;
  --layout-header-height: 48px;
  --layout-max-width: 1400px;

  /* Dense spacing */
  --layout-page-padding: 16px;
  --layout-section-gap: 12px;
  --layout-card-padding: 12px;

  /* Transitions */
  --layout-transition: 200ms ease-in-out;
}

.layout-dense {
  /* Main container */
}

.layout-dense-content {
  /* Content area with proper margins */
}

.layout-dense-header {
  /* Compact header */
}
```

#### Task 2.2: Create DenseLayout Component
`src/components/layout/DenseLayout.tsx`:
- Wrapper component for all pages
- Handles sidebar offset
- Manages responsive behavior
- Provides consistent padding/spacing

#### Task 2.3: Update App.tsx
- Use DenseLayout wrapper
- Remove legacy layout classes
- Implement proper sidebar offset

### Phase 3: Component Updates

#### Task 3.1: Update SettingsLayout
- Match dense spacing (12px gaps)
- Reduce padding to 16px
- Use consistent typography scale
- Fixed height sections where appropriate

#### Task 3.2: Create PageHeader Component
- Unified page header with consistent height (48px)
- Breadcrumbs support
- Actions slot
- Dense typography

#### Task 3.3: Update Sidebar (already have SidebarDense)
- Ensure smooth transitions
- Mobile overlay improvements
- Keyboard navigation
- Consistent with dense theme

### Phase 4: Custom UI Implementation (Proper)

#### Task 4.1: Create Custom Button Override
`src/components/custom_ui/button.tsx`:
```tsx
// Extends shadcn button with dense styling
import { Button as ShadcnButton } from "@/components/ui/button";
// Add dense padding, smaller text, etc.
```

#### Task 4.2: Create Custom Card Override
`src/components/custom_ui/card.tsx`:
- Tighter padding (12px vs 24px)
- Subtle shadows
- Consistent border radius

#### Task 4.3: Create Custom Input Override
- Smaller height (32px vs 40px)
- Denser padding
- Consistent focus states

### Phase 5: Style Consolidation

#### Task 5.1: Merge Layout Styles
- Move all layout styles to layout-dense.css
- Remove legacy layout styles from index.css
- Create clear separation of concerns

#### Task 5.2: Create CSS Architecture
```
src/styles/
├── base.css          # Tailwind base
├── tokens.css        # Design tokens
├── layout-dense.css  # Layout system
├── dashboard-density.css # Dashboard specific
└── components.css    # Component overrides
```

---

## 📐 Design Specifications

### Layout Dimensions
```
Sidebar Expanded: 220px
Sidebar Collapsed: 72px
Page Padding: 16px (desktop), 12px (tablet), 8px (mobile)
Section Gap: 12px
Card Padding: 12px
Header Height: 48px
Max Content Width: 1400px
```

### Typography Scale (Layout)
```
Page Title: 20px bold
Section Title: 16px semibold
Label: 13px regular
Micro: 11px regular
```

### Spacing Scale
```
0: 4px (0.25rem)
1: 8px (0.5rem)
2: 12px (0.75rem)
3: 16px (1rem)
4: 24px (1.5rem)
5: 32px (2rem)
```

### Responsive Breakpoints
```
Mobile: < 768px
Tablet: 768-1279px
Desktop: 1280px+
```

---

## ✅ Success Criteria

1. **Zero unused components** - all cleanup complete
2. **Proper component organization** - custom_ui only has shadcn overrides
3. **Consistent dense design** - all layouts match dashboard density
4. **Single source of truth** for layout styles
5. **No broken imports** after reorganization
6. **Build passes** without errors
7. **TypeScript strict** compliance
8. **Responsive** across all breakpoints
9. **Smooth transitions** without layout shift
10. **Accessibility** maintained (keyboard nav, ARIA)

---

## 🚀 Implementation Order

1. **Cleanup Phase** (30 min)
   - Delete unused components
   - Create src/components/shared folder
   - Move and reorganize components
   - Update imports

2. **Layout System** (1 hour)
   - Create layout-dense.css
   - Build DenseLayout component
   - Update App.tsx
   - Test responsive behavior

3. **Component Updates** (45 min)
   - Update SettingsLayout
   - Create PageHeader
   - Refine SidebarDense

4. **Custom UI** (45 min)
   - Create proper shadcn overrides
   - Test with existing usage
   - Document override patterns

5. **Testing & Documentation** (30 min)
   - Run build
   - Fix any issues
   - Document changes
   - Update component map

---

## 📝 Notes

- Keep existing functionality intact
- Maintain backward compatibility where possible
- Document breaking changes
- Create migration guide if needed
- Follow React 19.1 patterns (no useMemo/useCallback)
- Ensure all components are properly typed
- Test on all breakpoints
- Verify accessibility

---

## 🎨 Visual Consistency Rules

1. **Borders**: Use border utility, never hard 1px borders
2. **Shadows**: Subtle shadows only (shadow-sm, shadow)
3. **Corners**: Consistent radius (rounded-md primary)
4. **Colors**: Use CSS variables, not hardcoded
5. **Spacing**: Use spacing scale, not arbitrary values
6. **Typography**: Use defined scale, not custom sizes
7. **Transitions**: 200ms standard, 150ms for micro
8. **Focus states**: Consistent ring styles

---

## 🔄 Migration Path

For teams upgrading:
1. Install new layout system alongside old
2. Migrate page by page
3. Remove old system when complete
4. Update documentation

For this project:
1. Direct replacement (single dev)
2. Test all routes
3. Verify data flow unchanged
4. Commit with clear message

---

**End of Plan**

Next Step: Begin implementation starting with Phase 1 cleanup.