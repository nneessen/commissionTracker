# CRITICAL DESIGN RULE: NO HARD BORDERS EVER

## Absolute Rule
**NEVER use hard borders (`border`, `border-t`, `border-b`, `border-l`, `border-r`, `border-x`, `border-y`) in any component, anywhere, ever.**

## What to Use Instead
- Shadows: `shadow-sm`, `shadow-md`, `shadow-lg`
- Subtle backgrounds: `bg-muted/10`, `bg-accent/5`
- Gradients: `bg-gradient-to-br from-muted/10 to-card`
- Spacing/padding for visual separation
- Different opacity levels

## Recent Violations to Fix
- AlertsPanel.tsx line 70: Added `border ${classes.border}` - MUST REMOVE
- Any other component with border classes

## Why This Matters
The user has stated this requirement multiple times. Hard borders create harsh visual breaks and do not match the desired design aesthetic of the application.

## Enforcement
Before ANY commit or file change:
1. Search for `border-` or `className.*border`
2. Remove ALL border classes
3. Replace with shadows or subtle backgrounds
