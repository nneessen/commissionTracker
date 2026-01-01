# public facing join my team funnel/slug

# This is already done, and currently working - The end is the exact same towards the bottom of the page

## Task

Redesign the PublicJoinPage to be visually stunning and eye-catching. Style changes only.

## Context

The `/join-the-standard` URL is now working. The page loads correctly with data fetching via useState/useEffect (bypassed React Query). Now need to make it look amazing.

## Design Requirements

### Branding

- **Agency**: "The Standard" (NOT Founders Financial, NOT IMO stuff)
- **Logo**: `/logos/LetterLogo.png` (use `invert` class on dark backgrounds)
- **Tagline**: "Join The Standard Team" (community-focused messaging)

### Color Scheme

- **Primary**: Black and white monochrome aesthetic
- **Highlights**: Strategic color pops (amber/gold for CTAs, can explore red/blue accents)
- **Follow existing CSS variables** from index.css (--foreground, --background, etc.)

### Layout (Match Login Page Style)

- Split-panel layout: 55% dark hero (left) / 45% light form (right)
- Mobile: Stacked with hero compressed
- Reference: `src/features/auth/Login.tsx` for exact patterns

### Visual Effects (From Login Page)

1. SVG grid pattern background (60px grid, 3% opacity)
2. Diagonal gradient accent lines at -35deg
3. Glass-morphism form card with subtle glow
4. Micro-animations (pulse, float effects)

### Typography

- Large, bold headlines (text-5xl/6xl)
- White text on dark hero, dark text on light form
- Opacity modifiers for hierarchy (/70, /60)

## Files to Modify

1. **`src/features/recruiting/pages/PublicJoinPage.tsx`**
   - Redesign layout to split-panel
   - Add hero section with visual effects
   - Remove all IMO/Founders Financial references
   - Hardcode "The Standard" branding

2. **`src/features/recruiting/components/public/LeadInterestForm.tsx`**
   - Glass-morphism card styling
   - Enhanced submit button (amber/gold gradient)
   - Trust signals section

3. **`src/features/recruiting/components/public/LeadSubmissionConfirmation.tsx`**
   - Celebratory success animation
   - Remove IMO references

4. **`src/index.css`** (if needed)
   - Add animation keyframes (pulse-slow, float)

## Feature Bullets for Hero

- 💰 Unlimited Income Potential
- 📚 Full Training Provided
- ⏰ Flexible Schedule
- 🚀 Fast-Track Career Growth
- 🤝 Mentorship & Support

## Reference Files

- `src/features/auth/Login.tsx` - Split-panel layout, grid pattern, diagonal lines
- `src/index.css` - CSS variables and existing animations
- `docs/component-styling-guide.md` - Button/input variant patterns

## Current State

- PublicJoinPage works functionally (useState/useEffect pattern)
- Form submission works
- Lead acceptance/rejection works
- Just needs visual polish

## Instructions

Implement the redesign following the patterns from Login.tsx. Make it premium, bold, and impressive. Black/white base with strategic amber/gold highlights for CTAs.

# This is already done, and currently working
