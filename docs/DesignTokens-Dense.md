# Design Tokens - Dense Dashboard

## Typography Scale (Compact)
```css
--font-size-xl: 20px;   /* Page titles */
--font-size-lg: 16px;   /* Section headers */
--font-size-md: 13px;   /* Labels/subtitles */
--font-size-sm: 11px;   /* Micro labels */
--font-weight-strong: 700;
--font-weight-medium: 600;
--font-weight-regular: 400;
```

## Spacing Scale (rem-based)
```css
s-0: 0.25rem  (4px)
s-1: 0.5rem   (8px)
s-2: 0.75rem  (12px)
s-3: 1rem     (16px)
s-4: 1.5rem   (24px)
s-5: 2rem     (32px)
```

## Grid System
```css
--max-content-width: 1400px
Desktop (xl): 3 columns, gap: 12px
Tablet (md): 2 columns, gap: 12px
Mobile: 1 column, gap: 12px
```

## Component Dimensions
```css
/* KPI Cards */
Small: w-full h-28 p-3 rounded-md (112px height)
Large: w-full h-44 p-3 rounded-md (176px height)

/* Charts */
Primary: w-full h-56 p-4 rounded-lg (224px height)
Secondary: w-full h-44 p-3 rounded-md (176px height)
Sparkline: w-full h-28 p-3 rounded-md (112px height)

/* Tables */
Standard: w-full h-[420px] p-4 rounded-md
Compact: w-full h-[320px] p-3 rounded-md

/* Sidebar */
Expanded: 220px width
Collapsed: 72px width
Transition: 200ms ease-in-out
Mobile: -100% translateX when hidden
```

## Color Tokens (shadcn compatible)
```css
/* Charts */
--chart-1: oklch(0.3211 0 0)
--chart-2: oklch(0.4495 0 0)
--chart-3: oklch(0.5693 0 0)
--chart-4: oklch(0.683 0 0)
--chart-5: oklch(0.7921 0 0)

/* Commission Status */
--commission-positive: oklch(0.6421 0.1902 146.6154)
--commission-negative: oklch(0.6627 0.0978 20.0041)
--commission-neutral: oklch(0.7058 0 0)
```

## Responsive Breakpoints
```css
Mobile: 0-767px (1 column)
Tablet (md): 768-1279px (2 columns)
Desktop (xl): 1280px+ (3 columns)
```

## Density Rationale

The chosen dimensions maximize information density while maintaining readability through:

1. **112px KPI cards** - Optimal height for metric + label + sparkline without feeling cramped
2. **20px metric values** - Large enough for quick scanning but compact enough for density
3. **11-13px labels** - Readable micro-typography that doesn't dominate the metric
4. **12px grid gaps** - Tighter than default but maintains visual separation
5. **220px/72px sidebar** - Balanced expanded width, minimal collapsed footprint
6. **Fixed heights** - Prevents layout shift and enables reliable scanning patterns