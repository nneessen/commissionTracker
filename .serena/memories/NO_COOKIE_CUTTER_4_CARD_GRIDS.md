# CRITICAL DESIGN RULE: NO COOKIE-CUTTER 4-CARD GRIDS WITH SINGLE METRICS

## Absolute Rule
**NEVER create 4-card grid layouts with only one metric per card. This is lazy, cookie-cutter UI design.**

## What This Means
❌ **BAD PATTERN - Cookie Cutter:**
```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="rounded-lg p-4 bg-blue-50">
    <p className="text-xs">Total Policies</p>
    <p className="text-2xl font-bold">{totalPolicies}</p>
  </div>
  <div className="rounded-lg p-4 bg-emerald-50">
    <p className="text-xs">Total Premium</p>
    <p className="text-2xl font-bold">{totalPremium}</p>
  </div>
  {/* Two more cards with single metrics... */}
</div>
```

✅ **GOOD PATTERN - Data Dense:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Performance Overview</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Total Policies</p>
          <p className="text-xl font-bold">{totalPolicies}</p>
        </div>
        <Badge variant={status}>+12% MoM</Badge>
      </div>
      <Separator />
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Total Premium</p>
          <p className="text-xl font-bold">{totalPremium}</p>
        </div>
        <Badge variant={status}>+8% MoM</Badge>
      </div>
      {/* More metrics in same card with context */}
    </div>
  </CardContent>
</Card>
```

## Preferred Layout Patterns

### 1. Hybrid Layout (Best)
```
┌─────────────────────────────────────────┐
│  Full-Width Header with Actions         │
└─────────────────────────────────────────┘
┌──────────────────┬──────────────────────┐
│  Left Column     │  Right Column        │
│  (Data-dense     │  (Data-dense         │
│   cards with     │   cards with         │
│   multiple       │   multiple           │
│   metrics)       │   metrics)           │
└──────────────────┴──────────────────────┘
┌─────────────────────────────────────────┐
│  Full-Width Table or Chart              │
└─────────────────────────────────────────┘
```

### 2. Data-Dense Cards
- **Multiple metrics per card** - Not one metric per card
- **Context with metrics** - Show trends, badges, comparisons
- **Semantic grouping** - Related metrics together
- **Visual hierarchy** - Use typography and spacing, not separate cards

### 3. Real Examples from Codebase
**Good Examples:**
- `src/features/expenses/ExpenseDashboard.tsx` - Hybrid layout, data-dense cards
- `src/features/expenses/components/ExpenseSummaryCard.tsx` - 4+ metrics in ONE card
- `src/features/targets/TargetsPage.tsx` - Calculation breakdown, transparent math

**Bad Examples to Fix:**
- `src/features/hierarchy/components/AgentDetailModal.tsx` - THREE separate 4-card grids

## Why This Matters
1. **Wasted Space** - 4 cards for 4 numbers is inefficient
2. **Poor Scannability** - Eyes jump between disconnected cards
3. **No Context** - Single numbers without trends/comparisons are meaningless
4. **Cookie Cutter** - Looks like every generic admin dashboard template

## Design Principles

### Information Density
- Pack related information together
- Use vertical lists with separators over grids
- Show trends, comparisons, and context alongside raw numbers

### Layout Variety
- Mix full-width sections with 2-column grids
- Avoid repetitive grid patterns
- Use tables for detailed data, not card grids

### Semantic Grouping
- Group metrics by business logic, not just to fill grid spaces
- Use Card headers to explain what metrics mean together
- Add badges, progress bars, and context to metrics

## Enforcement

### Before Creating ANY Layout:
1. ❌ Is this a 4-card grid with single metrics? → REDESIGN
2. ✅ Can I combine these metrics into 1-2 data-dense cards? → YES
3. ✅ Am I showing context (trends, comparisons, status)? → YES
4. ✅ Does the layout match dashboard/analytics patterns? → YES

### Red Flags to Avoid:
- `grid grid-cols-4` with single-metric cards
- Separate cards for related metrics
- Cards with only a title and one number
- Repetitive grid layouts without variety

## User Feedback
> "if i told you i don't want cookie cutter 4 card rows with only one thing in each card, why do you keep doing it"

This is a CRITICAL design violation that frustrates the user. Never repeat this pattern.