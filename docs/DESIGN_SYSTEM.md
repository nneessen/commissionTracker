# Design System - Commission Tracker

## Core Design Principles

Based on analysis of Dashboard and Analytics pages.

## Layout Patterns

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Header (title + metadata) + TimePeriodSwitcher             │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐ ┌────────────────────┐ ┌──────────────┐
│ Left Sidebar │ │ Center Performance │ │ Right Sidebar│
│ (280px)      │ │ Card (flexible)    │ │ (320px)      │
│              │ │                    │ │              │
│ QuickStats   │ │ PerformanceTable   │ │ Alerts       │
│ Panel        │ │ + Status Banner    │ │ +            │
│ (dark bg)    │ │                    │ │ QuickActions │
└──────────────┘ └────────────────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Bottom DetailedKPIGrid (grid auto-fit minmax(200px, 1fr))  │
└─────────────────────────────────────────────────────────────┘
```

### Analytics Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Page Header (title + subtitle)                              │
│ TimePeriodSelector in card + Export buttons                 │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────┐  ┌────────────────────────┐
│ Card 1                 │  │ Card 2                 │
│ (PerformanceAttribution)│  │ (ClientSegmentation)    │
└────────────────────────┘  └────────────────────────┘

┌────────────────────────┐  ┌────────────────────────┐
│ Card 3                 │  │ Card 4                 │
│ (CohortAnalysis)       │  │ (PredictiveAnalytics)  │
└────────────────────────┘  └────────────────────────┘

2-column grid (window.innerWidth >= 1200 ? '1fr 1fr' : '1fr')
```

## Typography

```typescript
FONT_SIZES = {
  TITLE: '20px',
  SECTION_HEADER: '13px',        // Page sections, card titles
  SUBSECTION_HEADER: '11px',     // Sub-sections within cards
  STAT_LABEL: '10px',            // Small labels
  STAT_VALUE: '11px',            // Value text
  METRIC_VALUE: '28px',          // Large numbers
  TABLE_HEADER: '9px',           // Table column headers
  TABLE_CELL: '11px',            // Table cell text
  ALERT_TITLE: '10px',
  ALERT_TEXT: '9px',
  KPI_LABEL: '9px',
  KPI_VALUE: '10px',
  METADATA: '11px',              // Timestamps, etc.
}

TYPOGRAPHY = {
  MONO_FONT: 'Monaco, monospace',  // For numbers/values
  DEFAULT_FONT_WEIGHT: 500,
  BOLD_FONT_WEIGHT: 600,
  HEAVY_FONT_WEIGHT: 700,
}
```

## Colors

### Card Backgrounds
- White cards: `#ffffff`
- Dark sidebar: `linear-gradient(180deg, #1a1a1a 0%, #2d3748 100%)`
- Light gradient cards: `linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)`

### Text Colors
- Primary text: `#1a1a1a`
- Secondary text: `#656d76`
- Light text: `#94a3b8`
- Table headers: `#4a5568`

### Alert Colors
```typescript
ALERT_COLORS = {
  INFO: {
    background: '#dbeafe',
    border: '#3b82f6',
    text: '#1e3a8a',
    textLight: '#1e40af',
  },
  WARNING: {
    background: '#fef3c7',
    border: '#f59e0b',
    text: '#92400e',
    textLight: '#78350f',
  },
  DANGER: {
    background: '#fed7aa',
    border: '#ea580c',
    text: '#7c2d12',
  },
  ERROR: {
    background: '#fee2e2',
    border: '#dc2626',
    text: '#991b1b',
  },
  SUCCESS: {
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    textPrimary: '#065f46',
    textSecondary: '#047857',
  },
}
```

### Status Colors
```typescript
STATUS_COLORS = {
  HIT: '#10b981',     // >= 100%
  GOOD: '#3b82f6',    // >= 75%
  FAIR: '#f59e0b',    // >= 50%
  POOR: '#ef4444',    // < 50%
  NEUTRAL: '#94a3b8',
}
```

## Spacing

```typescript
BORDER_RADIUS = {
  LARGE: '12px',      // Card containers
  MEDIUM: '8px',      // Sub-sections
  SMALL: '6px',       // Buttons, badges
  XSMALL: '4px',      // Small elements
}

SHADOWS = {
  CARD: '0 2px 8px rgba(0,0,0,0.06)',
  SIDEBAR: '0 4px 12px rgba(0,0,0,0.15)',
  BUTTON_ACTIVE: '0 2px 4px rgba(0,0,0,0.1)',
}

SPACING = {
  SECTION_GAP: '16px',
  CARD_GAP: '12px',
  ITEM_GAP: '6px',
  SMALL_GAP: '4px',
}
```

## Card Structure Pattern

All cards follow this structure:

```tsx
<div style={{
  background: '#ffffff',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}}>
  {/* Header */}
  <div style={{
    fontSize: '13px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }}>
    CARD TITLE
  </div>

  {/* Optional Subtitle */}
  <div style={{
    fontSize: '11px',
    color: '#656d76',
    marginBottom: '20px'
  }}>
    Descriptive subtitle
  </div>

  {/* Card Content */}
  ...
</div>
```

## Table Pattern

```tsx
<table style={{
  width: '100%',
  fontSize: '11px',
  borderCollapse: 'collapse',
}}>
  <thead>
    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
      <th style={{
        textAlign: 'left',
        padding: '8px 4px',
        fontWeight: 600,
        color: '#4a5568',
        textTransform: 'uppercase',
        fontSize: '9px',
        letterSpacing: '0.5px',
      }}>
        COLUMN
      </th>
    </tr>
  </thead>
  <tbody>
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '8px 4px', color: '#1a1a1a' }}>
        Cell
      </td>
    </tr>
  </tbody>
</table>
```

## Header Patterns

### Page Header (Analytics Style)
```tsx
<h1 style={{
  fontSize: '24px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '8px'
}}>
  Page Title
</h1>
<p style={{
  fontSize: '14px',
  color: '#656d76',
  marginBottom: '20px'
}}>
  Page description
</p>
```

### Section Header (Inside Cards)
```tsx
<div style={{
  fontSize: '13px',
  fontWeight: 600,
  color: '#1a1a1a',
  marginBottom: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}}>
  SECTION NAME
</div>
```

## Loading States

```tsx
<div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
  Loading...
</div>
```

## Info Button Pattern (Analytics)

```tsx
<button
  onClick={() => setShowInfo(!showInfo)}
  style={{
    background: '#f0f9ff',
    border: '1px solid #e0f2fe',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    color: '#3b82f6',
    transition: 'all 0.2s ease',
  }}
  title="Click for detailed explanation"
>
  i
</button>
```

## Key Design Rules

1. **All section headers** are uppercase, `13px`, `600` weight, `letterSpacing: '0.5px'`
2. **All cards** use `borderRadius: '12px'` and `boxShadow: '0 2px 8px rgba(0,0,0,0.06)'`
3. **All table headers** are uppercase, `9px`, gray text
4. **All monetary values** use Monaco monospace font
5. **Status indicators** use specific colors: green (good), blue (fair), orange (warning), red (poor)
6. **Responsive grids** check `window.innerWidth` for breakpoints (1200px threshold)
7. **Background** is `#f8f9fa` for page, `#ffffff` for cards
8. **Padding** is typically `20px` for cards, `16px` for sections

## What NOT to Do

❌ Don't use creative/weird layouts
❌ Don't use different font sizes than defined
❌ Don't use non-standard shadows or borders
❌ Don't use inline styles that don't match the constants
❌ Don't create custom color schemes
❌ Don't use different padding/spacing values

✅ Follow the exact patterns from Dashboard and Analytics
✅ Use constants from `src/constants/dashboard.ts`
✅ Match the exact typography hierarchy
✅ Use the exact same card structure
✅ Copy the table patterns exactly
