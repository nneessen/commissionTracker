# Fix Logo Colors in PublicJoinPage Dark/Light Modes

## Issue
Mobile logo is invisible/wrong in dark mode on the public join page. User has added separate light and dark logo versions to replace the CSS invert approach.

## Available Logo Files
- `public/logos/LetterLogo.png` - Dark version (for light backgrounds)
- `public/logos/Light Letter Logo .png` - Light version (for dark backgrounds)

## Current Implementation Problem
Currently using CSS `invert` classes which don't work correctly. The mobile logo has no dark mode handling at all, causing it to be invisible in dark mode.

## Solution Approach
Replace CSS inversion with conditional logo rendering using Tailwind's `dark:` variant to show the appropriate logo file based on theme.

### Desktop Left Panel (Line 166-171)
- Has `bg-foreground` which means:
  - Light mode: dark background → needs **light logo**
  - Dark mode: light background → needs **dark logo**
- Current: Uses `invert dark:invert-0` on single logo
- Fix: Use two `<img>` tags with dark: display classes

```tsx
<img
  src="/logos/Light Letter Logo .png"
  alt="The Standard"
  className="relative h-14 w-14 drop-shadow-2xl dark:hidden"
/>
<img
  src="/logos/LetterLogo.png"
  alt="The Standard"
  className="relative h-14 w-14 drop-shadow-2xl hidden dark:block"
/>
```

### Mobile Logo (Line 291-294)
- Has default background which means:
  - Light mode: light background → needs **dark logo**
  - Dark mode: dark background → needs **light logo**
- Current: Single logo with no dark mode handling (causes invisible logo in dark mode)
- Fix: Use two `<img>` tags with dark: display classes

```tsx
<img
  src="/logos/LetterLogo.png"
  alt="The Standard"
  className="h-10 w-10 dark:hidden"
/>
<img
  src="/logos/Light Letter Logo .png"
  alt="The Standard"
  className="h-10 w-10 hidden dark:block"
/>
```

## Files to Modify
- `/Users/nickneessen/projects/commissionTracker/src/features/recruiting/pages/PublicJoinPage.tsx`
  - Line 166-171: Desktop left panel logo
  - Line 291-294: Mobile logo

## Implementation Steps
1. Update desktop left panel logo to use conditional rendering with both logo variants
2. Update mobile logo to use conditional rendering with both logo variants
3. Remove all `invert` CSS classes (no longer needed)
4. Test in both light and dark modes on desktop and mobile

## Expected Outcome
- Desktop left panel: Light logo visible on dark background (light mode), dark logo visible on light background (dark mode)
- Mobile: Dark logo visible on light background (light mode), light logo visible on dark background (dark mode)
- No more CSS inversion needed
- Logos always have proper contrast and visibility
