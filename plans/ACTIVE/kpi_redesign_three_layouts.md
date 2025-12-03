# KPI Breakdown Redesign: 3 Unique Modern Layouts

**Status:** Active
**Created:** 2025-01-19
**Objective:** Create 3 completely distinct, modern KPI breakdown section designs with interactive switcher

---

## Problem Statement

Current KPI breakdown (KPIGrid.tsx) is functional but limited:

- Simple text-based grid layout
- No visual hierarchy beyond icons
- No data visualization
- Static, non-interactive
- All metrics have equal visual weight

User request: "3 modern and unique completely redesigned detailed kpi breakdown section... ultrathought out. modern, awesome and completely amazing. it should not be anything cookie cutter"

---

## Design Philosophies

### Design 1: Visual Heatmap Dashboard

**Inspiration:** Bloomberg Terminal + Modern Data Visualization

**Key Features:**

- **Color-Coded Performance Cells:** Gradient intensity based on target achievement
  - Performance < 70%: Red spectrum (HSL 0, 70%, 50-70%)
  - Performance 70-90%: Yellow/Amber (HSL 45, 70%, 50-70%)
  - Performance > 90%: Green spectrum (HSL 120, 70%, 40-60%)
- **Mini Sparklines:** Simple SVG path trends embedded in each cell (7-day/30-day)
- **Masonry Layout:** Variable cell sizes via CSS Grid
  - Primary metrics (revenue, policies sold): Larger cells
  - Secondary metrics (rates, counts): Smaller cells
- **Interactive Tooltips:** Hover reveals detailed info, formulas, historical comparison
- **No Hard Borders:** Separation via background colors and spacing only

**Technical Implementation:**

- CSS Grid with auto-fit for responsive cells
- Pure SVG for sparklines (no chart library)
- Radix UI Tooltip for hover details
- HSL color space for smooth gradients
- Scale transform on hover

---

### Design 2: Story-Driven Narrative Dashboard

**Inspiration:** Apple Product Pages + Data Storytelling

**Key Features:**

- **Natural Language Insights:** Convert numbers into stories
  - "You earned $12,450 this month, which is 23% above your target"
  - "Your avg premium is $1,250, up $150 from last month"
  - "You need 3 more policies this week to stay on track"
- **Vertical Flow:** Cascading layout with staggered reveal
- **Progress Visualizations:** Linear progress bars with gradient fills
- **Comparative Context:** Always show historical comparison and trends
- **Actionable Recommendations:** System generates insights based on performance

**Visual Hierarchy:**

- Hero metric (top): 3xl font, 700 weight (most important: net income or policies sold)
- Supporting metrics: xl font, 600 weight
- Labels: sm font, 400 weight
- Descriptions: text-sm, muted-foreground
- Color accents via left edge bars (not full backgrounds)

**Technical Implementation:**

- Vertical stack with entrance animations (staggered delays)
- Typography scale for hierarchy
- Helper function generates contextual insights
- Micro-animations on number changes
- Radial charts for targets

---

### Design 3: Command Center Matrix

**Inspiration:** Military/Aerospace HUD + Mission Control

**Key Features:**

- **Quadrant Layout:** 2x2 CSS Grid dividing KPIs into zones
  - Quadrant 1 (top-left): Critical Financial Metrics
  - Quadrant 2 (top-right): Production Metrics
  - Quadrant 3 (bottom-left): Performance Indicators
  - Quadrant 4 (bottom-right): Targets & Pace
- **Circular Gauges:** Apple Watch-style ring progress indicators
- **Status Indicators:** Green/Yellow/Red dots with pulse animations
- **Technical Typography:** Monospace fonts for numbers (JetBrains Mono, Fira Code, Courier New)
- **Subtle Effects:** Scanline animation, connecting lines between related metrics
- **Structured Grid:** Elegant subtle borders (border-border/20), not heavy

**Visual Details:**

- Mini gauges and dials for percentage-based metrics
- Pulsing indicators for real-time/critical changes
- Subtle glow effects on active values (box-shadow with theme colors)
- Grid lines create professional structure
- Data streams presentation

**Technical Implementation:**

- 2x2 CSS Grid (responsive: stack on mobile)
- SVG circular progress (custom gauge component)
- Pseudo-element repeating-linear-gradient for scanline
- Pulse animation with keyframes
- Absolute positioned status dots

---

## Architecture & Implementation

### Component Structure

**New Components:**

```
src/features/dashboard/components/
├── KPIGridHeatmap.tsx          # Design 1: Heatmap layout
├── KPIGridNarrative.tsx        # Design 2: Narrative layout
├── KPIGridMatrix.tsx           # Design 3: Matrix layout
├── KPILayoutSwitcher.tsx       # Toggle button component
└── kpi-layouts/
    ├── MiniSparkline.tsx       # Reusable SVG sparkline
    ├── CircularGauge.tsx       # Circular progress gauge
    └── NarrativeInsight.tsx    # Insight card component
```

**New Hook:**

```
src/hooks/useKPILayout.ts       # Layout preference management (localStorage)
```

**Modified Files:**

- `src/features/dashboard/DashboardHome.tsx` - Add switcher, conditional rendering
- `src/features/dashboard/components/index.ts` - Export new components
- `src/types/dashboard.types.ts` - Add KPILayout type

### Data Flow

```
kpiConfig (KPISection[])
  ↓
DashboardHome (manages layout state)
  ↓
KPILayoutSwitcher (user selection)
  ↓
[KPIGridHeatmap | KPIGridNarrative | KPIGridMatrix]
  ↓
Shared components (MiniSparkline, CircularGauge, etc.)
```

**Key Points:**

- All 3 layouts consume the SAME data: `KPISection[]` from `kpiConfig`
- Each layout transforms/presents data differently
- No changes to data fetching or calculation logic
- Layout preference stored in localStorage (UI preference only)

### Type Definitions

```typescript
// Add to dashboard.types.ts
export type KPILayout = "heatmap" | "narrative" | "matrix";

export interface KPILayoutSwitcherProps {
  layout: KPILayout;
  onLayoutChange: (layout: KPILayout) => void;
}
```

### Layout Switcher Design

**Position:** Dashboard header, near TimePeriodSwitcher or as floating action button

**Visual Style:**

- Icon-based button group (similar to TimePeriodSwitcher)
- 3 icons representing each layout:
  - Heatmap: Grid3x3 with color dots
  - Narrative: List or AlignJustify
  - Matrix: LayoutGrid or Grid2x2
- Active state: bg-card with shadow-sm
- Smooth transitions: 300ms fade between layouts

**Behavior:**

- Click to switch layouts
- Active layout highlighted
- Tooltip on hover showing layout name
- Keyboard accessible

---

## User Experience

### Transitions & Animations

- **Layout Switch:** Fade out old (200ms) → Fade in new (300ms)
- **Heatmap:** Scale transform on cell hover
- **Narrative:** Staggered entrance animations with delays
- **Matrix:** Pulse animation on status indicators
- **Performance:** CSS transforms for GPU acceleration

### Accessibility

- Keyboard navigation support (Tab, Enter, Space)
- ARIA labels for screen readers
- Focus management on layout switch
- Respect `prefers-reduced-motion` for animations

### Responsive Behavior

- **Desktop (>1024px):** Full layouts as designed
- **Tablet (768-1024px):**
  - Heatmap: 2-3 columns
  - Narrative: Full vertical stack
  - Matrix: 2x2 grid maintained
- **Mobile (<768px):**
  - Heatmap: 2 columns
  - Narrative: Full vertical (works best on mobile)
  - Matrix: Stack quadrants vertically (1 column)

---

## Implementation Checklist

### Phase 1: Foundation

- [x] Create plan document in plans/ACTIVE/
- [ ] Add KPILayout type to dashboard.types.ts
- [ ] Create useKPILayout hook with localStorage
- [ ] Test hook functionality

### Phase 2: Shared Components

- [ ] Create MiniSparkline.tsx (SVG sparkline)
- [ ] Create CircularGauge.tsx (progress rings)
- [ ] Create NarrativeInsight.tsx (insight cards)
- [ ] Test components in isolation

### Phase 3: Layout Components

- [ ] Create KPIGridHeatmap.tsx
  - Grid system with masonry
  - Color gradient logic
  - Sparkline integration
  - Hover tooltips
- [ ] Create KPIGridNarrative.tsx
  - Vertical flow layout
  - Insight generation logic
  - Progress bars
  - Typography hierarchy
- [ ] Create KPIGridMatrix.tsx
  - Quadrant grid
  - Circular gauges
  - Status indicators
  - Scanline effect

### Phase 4: Switcher & Integration

- [ ] Create KPILayoutSwitcher.tsx
- [ ] Update component exports in index.ts
- [ ] Integrate into DashboardHome.tsx
  - Add layout state
  - Add switcher to header
  - Conditional rendering of layouts
  - Wire up layout change handler

### Phase 5: Testing & Polish

- [ ] Test all 3 layouts render correctly with data
- [ ] Test switcher toggles between layouts
- [ ] Test localStorage persists preference
- [ ] Test responsive behavior (desktop, tablet, mobile)
- [ ] Test keyboard navigation
- [ ] Test reduced-motion support
- [ ] Run TypeScript typecheck
- [ ] Run npm run typecheck
- [ ] Fix any TS errors

### Phase 6: Completion

- [ ] Update plan status to COMPLETED
- [ ] Move plan to plans/COMPLETED/
- [ ] Rename file: `YYYYMMDD_kpi_redesign_three_layouts_COMPLETED.md`

---

## Technical Constraints & Best Practices

### Must Follow (from CLAUDE.md):

- ✅ TypeScript strict mode
- ✅ Conventional naming (PascalCase components, camelCase functions, kebab-case files)
- ✅ Prefer composition over HOCs
- ✅ NO useCallback/useMemo unless profiling shows benefit
- ✅ NO hard borders (use subtle borders with low opacity)
- ✅ NO nested cards
- ✅ Use Tailwind CSS v4
- ✅ NO inline styles (refactored out)
- ✅ localStorage ONLY for UI preferences (allowed for layout preference)
- ✅ All application data from Supabase (not applicable here, displaying existing data)

### Performance Considerations:

- Memoize metric calculations (if needed)
- CSS transforms for animations (GPU accelerated)
- Pure SVG for visualizations (no heavy chart libraries)
- Lazy load components if needed
- Virtual scrolling if narrative layout gets too long

### Code Quality:

- JSDoc comments for all exported components
- Type safety (no `any` types)
- Error handling for edge cases
- Accessible ARIA labels
- Semantic HTML

---

## Success Criteria

✅ **Functionality:**

- 3 distinct layouts all render correctly
- Switcher toggles between layouts smoothly
- Layout preference persists across page refreshes
- All layouts work with existing KPI data

✅ **Design Quality:**

- Each layout has unique visual identity
- Modern, professional aesthetics
- Not cookie-cutter or generic
- Delightful micro-interactions

✅ **Technical Quality:**

- No TypeScript errors
- Responsive on all screen sizes
- Accessible (keyboard, screen readers)
- Good performance (no jank)

✅ **User Experience:**

- Easy to switch layouts
- Each layout provides value in different way
- Smooth transitions
- Works with existing dashboard flow

---

## Notes

- User emphasized "ultrathink" and "not cookie cutter" - these designs go beyond typical grid layouts
- Design 1 (Heatmap) is most visually striking - good default
- Design 2 (Narrative) is most beginner-friendly and contextual
- Design 3 (Matrix) is most professional/technical
- Each serves different user needs and preferences
- Switcher makes it easy to try all 3 and pick favorite

---

**End of Plan**
