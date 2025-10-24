# Dashboard Dense - Test Plan

## Manual Testing Checklist

### 1. Responsiveness Testing
**Verify the dashboard adapts correctly across breakpoints**

#### Desktop (1280px+)
- [ ] Dashboard displays in 3-column grid layout
- [ ] Sidebar shows at 220px width expanded
- [ ] All KPI cards fit within grid without overflow
- [ ] Charts maintain 224px height (h-56)
- [ ] Tables show virtualization for >20 rows

#### Tablet (768-1279px)
- [ ] Dashboard switches to 2-column grid
- [ ] Sidebar remains functional
- [ ] KPI cards reflow properly
- [ ] Charts scale appropriately
- [ ] Mobile menu not shown

#### Mobile (<768px)
- [ ] Dashboard switches to 1-column layout
- [ ] Sidebar converts to overlay mode
- [ ] Mobile menu button appears
- [ ] All cards stack vertically
- [ ] Typography remains readable

### 2. Density Verification
**Confirm high-density metrics display without cramping**

- [ ] KPI cards show metric (20px), label (13px), and sparkline in 112px height
- [ ] Grid gaps maintain 12px spacing consistently
- [ ] At least 6 KPI cards visible above the fold on desktop
- [ ] Chart cards maintain fixed heights without content shift
- [ ] Data tables show 10+ rows without scrolling in 420px height

### 3. Data Skeleton Behavior
**Test loading states and skeleton loaders**

- [ ] Initial page load shows skeleton components
- [ ] Skeletons match exact dimensions of loaded components
- [ ] No layout shift when transitioning from skeleton to loaded
- [ ] Skeleton animation is smooth and consistent
- [ ] Loading states handle errors gracefully

### 4. Interaction Testing

#### Sidebar
- [ ] Collapse/expand transitions smoothly (200ms)
- [ ] Collapsed state shows tooltips on hover
- [ ] Mobile overlay dismisses on outside click
- [ ] Navigation highlights active route

#### KPI Cards
- [ ] Hover effect lifts card slightly (-0.5px translate)
- [ ] Click opens detail sheet with full data
- [ ] Sparklines render without overflow
- [ ] Delta indicators show correct colors (green/red/neutral)

#### Charts
- [ ] Tab switching updates chart data
- [ ] Tooltips show on hover with exact values
- [ ] Dropdown menu opens with export/filter options
- [ ] Charts resize smoothly with container

#### Data Tables
- [ ] Search filters rows in real-time
- [ ] Sort toggles through asc/desc/none
- [ ] Virtualization activates for >20 rows
- [ ] Row actions dropdown opens correctly
- [ ] Pagination info updates accurately

## Performance Testing

### Metrics to Verify
1. **Initial Load**: < 2 seconds for dashboard render
2. **Interaction Latency**: < 100ms for user actions
3. **Memory Usage**: Stable with virtualized lists
4. **Bundle Size**: Chart libraries lazy-loaded

### Browser Compatibility
- [ ] Chrome 120+
- [ ] Safari 17+
- [ ] Firefox 120+
- [ ] Edge 120+

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible and clear
- [ ] ARIA labels present on icon buttons
- [ ] Color contrast meets WCAG 4.5:1 ratio
- [ ] Screen reader announces navigation properly
- [ ] Skip links available for keyboard users

## Component Export Verification

Ensure all components are properly exported and importable:

```typescript
// Test imports
import { KpiCardDense } from './components/KpiCardDense';
import { ChartCardDense } from './components/ChartCardDense';
import { DataTableDense } from './components/DataTableDense';
import { SidebarDense } from '@/components/layout/SidebarDense';
import { DashboardDense } from './DashboardDense';
import {
  KpiSkeleton,
  ChartSkeleton,
  TableSkeleton,
  DashboardSkeleton
} from './components/SkeletonLoaders';
```

## Storybook Testing (if applicable)

### KPI Card Variants
1. **Positive Delta**: Green indicator, upward trend
2. **Negative Delta**: Red indicator, downward trend
3. **Neutral**: Gray indicator, no change

### Chart Types
1. **Line Chart**: Time series data
2. **Area Chart**: Cumulative metrics
3. **Bar Chart**: Comparative data

### Table States
1. **Empty**: No data message
2. **Loading**: Skeleton rows
3. **Populated**: With virtualization
4. **Filtered**: Search active

## Automated Testing Commands

```bash
# Type checking
npm run type-check

# Build verification
npm run build

# Component tests
npm run test

# Performance profiling
npm run profile
```

## Success Criteria

✅ All manual tests pass
✅ No TypeScript errors
✅ Build completes successfully
✅ Performance metrics met
✅ Accessibility standards satisfied
✅ Cross-browser compatibility confirmed