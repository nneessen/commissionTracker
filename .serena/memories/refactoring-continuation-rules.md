# Refactoring Continuation Rules

## CRITICAL: Never Ask to Continue
- If there's a plan/todo list tracking incomplete work, NEVER ask "would you like me to continue?"
- Continue working until COMPLETE or context reaches 10% remaining
- At 10% context remaining, write a continuation prompt for next session

## Color Application Rules - NON-NEGOTIABLE
User feedback: "why am i only seeing two shades across this entire app. dark grey and white. why are we not incorporating some contrast."

### WRONG (What I Keep Doing):
```tsx
className="bg-card text-foreground"
className="bg-muted text-muted-foreground"
```

### RIGHT (What I Should Do):
```tsx
// Cards get COLORED gradients, not just bg-card
className="bg-gradient-to-br from-success/20 via-status-active/10 to-card shadow-md"

// Values/numbers get COLORED text, not text-foreground
className="text-success font-mono" // green for positive
className="text-info font-mono"    // blue for earned
className="text-warning font-mono" // yellow for pending
className="text-destructive font-mono" // red for negative

// Icons get COLORED backgrounds
className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg"

// Badges get COLORED gradients
className="bg-gradient-to-r from-info/20 to-status-earned/10 text-info"
```

### Color Palette (High Saturation OKLCH):
- Success/Active: green (`text-success`, `from-success/20`)
- Info/Earned: blue (`text-info`, `from-info/20`)
- Warning/Pending: yellow (`text-warning`, `from-warning/20`)
- Error/Destructive: red (`text-destructive`, `from-destructive/20`)
- Primary: purple/brand (`text-primary`, `from-primary/20`)

### Where Colors MUST Appear:
1. **Card backgrounds**: Gradient with color theme
2. **Numeric values**: Colored text matching context
3. **Status indicators**: Colored badges with gradients
4. **Icon backgrounds**: Vibrant colored gradients
5. **Progress bars**: Colored gradient fills

## No More Borders
Replace ALL `border border-border` with `shadow-md` or `shadow-lg`
