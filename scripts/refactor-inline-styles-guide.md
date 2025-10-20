# Inline Styles to Tailwind Classes - Refactoring Guide

## Common Style Mappings

### Colors
```javascript
// BEFORE (Inline/Hex)
color: '#1a1a1a'         → className="text-foreground"
color: '#4a5568'         → className="text-muted-foreground"
color: '#656d76'         → className="text-muted-foreground/80"
color: '#10b981'         → className="text-success"
color: '#3b82f6'         → className="text-info"
color: '#f59e0b'         → className="text-warning"
color: '#ef4444'         → className="text-error"
background: '#ffffff'    → className="bg-card"
background: '#f8f9fa'    → className="bg-muted/20"
background: '#e2e8f0'    → className="bg-muted/50"
```

### Spacing
```javascript
padding: '16px'          → className="p-4"
padding: '24px'          → className="p-6"
padding: '12px'          → className="p-3"
padding: '8px 12px'      → className="px-3 py-2"
margin: '16px'           → className="m-4"
marginBottom: '12px'     → className="mb-3"
gap: '12px'              → className="gap-3"
```

### Typography
```javascript
fontSize: '20px'         → className="text-xl"
fontSize: '14px'         → className="text-sm"
fontSize: '12px'         → className="text-xs"
fontSize: '11px'         → className="text-xs" (closest)
fontSize: '24px'         → className="text-2xl"
fontWeight: 600          → className="font-semibold"
fontWeight: 700          → className="font-bold"
textTransform: 'uppercase' → className="uppercase"
letterSpacing: '0.5px'   → className="tracking-wide"
fontFamily: 'Monaco...'  → className="font-mono"
```

### Layout
```javascript
display: 'flex'          → className="flex"
alignItems: 'center'     → className="items-center"
justifyContent: 'space-between' → className="justify-between"
flexDirection: 'column'  → className="flex-col"
display: 'grid'          → className="grid"
gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' → className="grid grid-cols-1 md:grid-cols-3"
width: '100%'            → className="w-full"
```

### Borders & Shadows
```javascript
borderRadius: '12px'     → className="rounded-lg"
borderRadius: '16px'     → className="rounded-lg"
borderRadius: '8px'      → className="rounded-md"
borderRadius: '6px'      → className="rounded-md"
borderRadius: '50%'      → className="rounded-full"
boxShadow: '0 2px 4px...' → className="shadow-sm"
boxShadow: '0 4px 20px...' → className="shadow-md"
border: '1px solid #e2e8f0' → className="border border-border"
```

### Gradients
```javascript
background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
→ className="bg-gradient-to-br from-card to-muted/20"

background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)'
→ className="bg-gradient-to-br from-primary to-primary/80"
```

## Conversion Process

1. Remove all imports of constants/dashboard.ts
2. Import cn helper: `import { cn } from '@/lib/utils'`
3. Replace style={{ }} with className=""
4. Use cn() for conditional classes
5. Keep inline styles ONLY for truly dynamic values (like width percentage)

## Example Refactor

### Before:
```jsx
<div style={{
  background: '#ffffff',
  borderRadius: '12px',
  padding: '16px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  marginBottom: '16px'
}}>
  <div style={{
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a1a1a',
    textTransform: 'uppercase'
  }}>
    Title
  </div>
</div>
```

### After:
```jsx
<div className="bg-card rounded-lg p-4 shadow-sm mb-4">
  <div className="text-sm font-semibold text-foreground uppercase">
    Title
  </div>
</div>
```

## Files Priority List (Most Critical)

### Dashboard (17 files, 243 inline styles)
1. ✅ PerformanceOverviewCard.tsx
2. ✅ FinancialHealthCard.tsx
3. ⏳ PaceTracker.tsx (39 instances)
4. DetailedKPIGrid_MetricsDashboard.tsx
5. QuickActionsPanel.tsx
6. QuickStatsPanel.tsx
7. DashboardHeader.tsx
8. AlertsPanel.tsx
9. DetailedKPIGrid.tsx
10. DetailedKPIGrid_TabbedView.tsx
11. DetailedKPIGrid_Accordion.tsx
12. DetailedKPIGrid_Compact.tsx
13. DateRangeDisplay.tsx
14. TimePeriodSwitcher.tsx
15. StatItem.tsx
16. PerformanceMetrics.tsx (42 instances)
17. ActivityFeed.tsx (30 instances)

### Other Features
- PolicyForm.tsx
- PolicyList.tsx
- CommissionList.tsx
- ExpenseCategoryBreakdown.tsx
- ExpenseTrendChart.tsx

## Automated Helper Script

Use VS Code Find & Replace with Regex:
1. Find: `style=\{\{([^}]+)\}\}`
2. Look for patterns in the guide above
3. Replace with appropriate className

## Testing Checklist
- [ ] Component renders correctly
- [ ] Dark mode works
- [ ] Responsive design maintained
- [ ] No visual regressions
- [ ] All interactive elements work