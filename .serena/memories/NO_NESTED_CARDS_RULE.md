# CRITICAL DESIGN RULE: NO NESTED CARDS EVER

## Absolute Rule
**NEVER use Card components inside other Card components. Period.**

## What This Means
- If a component returns a `<Card>`, do NOT use `<Card>` elements inside its content
- Replace nested `<Card>` with plain `<div>` elements
- Use `rounded-lg`, `shadow-md`, gradients, and padding to style inner sections

## Example: WRONG vs RIGHT

### ❌ WRONG - Nested Cards
```tsx
<Card>
  <CardContent>
    <Card className="bg-gradient-to-br from-info/20 to-card">
      <CardContent className="p-4">
        Content here
      </CardContent>
    </Card>
  </CardContent>
</Card>
```

### ✅ RIGHT - Simple divs
```tsx
<Card>
  <CardContent>
    <div className="bg-gradient-to-br from-info/20 to-card rounded-lg p-4 shadow-md">
      Content here
    </div>
  </CardContent>
</Card>
```

## Recent Violations Fixed
- FinancialHealthCard.tsx - Removed 4 nested Card elements
- PaceTracker.tsx - Removed 5 nested Card elements
- AlertsPanel.tsx - Removed nested Card elements
- KPIGrid.tsx - Removed nested Card elements

## Why This Matters
The user has explicitly stated this multiple times. Nested cards create visual clutter and inconsistent styling. Use simple divs with proper classes instead.

## Enforcement
Before ANY commit:
1. Search for `<Card` inside components that return `<Card>`
2. Replace ALL nested `<Card>` and `<CardContent>` with `<div>`
3. Add appropriate classes: `rounded-lg`, `shadow-md`, `p-4`, etc.
