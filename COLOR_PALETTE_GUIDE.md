# Color Palette Usage Guide

## Overview

This project now has a comprehensive color system with easy-to-use CSS variables and Tailwind utility classes. You no longer need to memorize hex codes!

---

## Available Color Palettes

### 1. Brand Colors (Blue Palette)

**Range:** `brand-50` to `brand-900`

```tsx
// Light to dark blues
<div className="bg-brand-50 text-brand-900">Lightest blue background</div>
<div className="bg-brand-500 text-white">Medium blue (primary)</div>
<div className="bg-brand-900 text-brand-50">Darkest blue</div>

// Borders
<div className="border border-brand-500">Blue border</div>
```

**Use Cases:**

- Primary buttons: `bg-brand-600`
- Hover states: `hover:bg-brand-700`
- Light backgrounds: `bg-brand-50`
- Links: `text-brand-600`

---

### 2. Accent Colors

**Available:** red, orange, yellow, green, blue, indigo, purple, pink

```tsx
// Text colors
<span className="text-accent-red">Error text</span>
<span className="text-accent-green">Success text</span>
<span className="text-accent-orange">Warning text</span>

// Background colors
<div className="bg-accent-red">Red background</div>
<div className="bg-accent-red-light">Light red background</div>

// All accent colors
<div className="bg-accent-red">Red</div>
<div className="bg-accent-orange">Orange</div>
<div className="bg-accent-yellow">Yellow</div>
<div className="bg-accent-green">Green</div>
<div className="bg-accent-blue">Blue</div>
<div className="bg-accent-indigo">Indigo</div>
<div className="bg-accent-purple">Purple</div>
<div className="bg-accent-pink">Pink</div>
```

**Use Cases:**

- Alerts: `bg-accent-red-light text-accent-red`
- Success messages: `bg-accent-green-light text-accent-green`
- Warning badges: `bg-accent-yellow-light text-accent-orange`

---

### 3. Grey Scale

**Range:** `grey-0` (white) to `grey-950` (near black)

```tsx
// Text colors
<p className="text-grey-900">Dark text</p>
<p className="text-grey-600">Medium grey text</p>
<p className="text-grey-400">Light grey text</p>

// Backgrounds
<div className="bg-grey-50">Very light grey</div>
<div className="bg-grey-100">Light grey</div>
<div className="bg-grey-800">Dark grey</div>

// Borders
<div className="border border-grey-300">Light border</div>
<div className="border border-grey-600">Dark border</div>
```

**Use Cases:**

- Card backgrounds: `bg-grey-50`
- Text hierarchy: `text-grey-900` (primary), `text-grey-600` (secondary)
- Disabled states: `bg-grey-200 text-grey-500`
- Dividers: `border-grey-300`

---

### 4. Border Radius

**Sizes:** xs, sm, md, lg, xl, 2xl, full

```tsx
<div className="rounded-xs">4px radius</div>
<div className="rounded-sm">6px radius</div>
<div className="rounded-md">8px radius (default)</div>
<div className="rounded-lg">12px radius</div>
<div className="rounded-xl">16px radius</div>
<div className="rounded-2xl">24px radius</div>
<div className="rounded-full">Fully rounded (circles/pills)</div>
```

---

## Real-World Examples

### Example 1: Alert Component

```tsx
// Success alert
<div className="bg-accent-green-light border-l-4 border-accent-green p-4 rounded-md">
  <p className="text-accent-green font-semibold">Success!</p>
  <p className="text-grey-700">Your data has been saved.</p>
</div>

// Error alert
<div className="bg-accent-red-light border-l-4 border-accent-red p-4 rounded-md">
  <p className="text-accent-red font-semibold">Error!</p>
  <p className="text-grey-700">Something went wrong.</p>
</div>
```

### Example 2: Button Variants

```tsx
// Primary button
<button className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg">
  Primary Action
</button>

// Secondary button
<button className="bg-grey-200 hover:bg-grey-300 text-grey-900 px-4 py-2 rounded-lg">
  Secondary Action
</button>

// Danger button
<button className="bg-accent-red hover:bg-accent-red text-white px-4 py-2 rounded-lg">
  Delete
</button>
```

### Example 3: Card Component

```tsx
<div className="bg-grey-0 border border-grey-200 rounded-xl p-6 shadow-sm">
  <h3 className="text-grey-900 text-xl font-semibold mb-2">Card Title</h3>
  <p className="text-grey-600 mb-4">Card description text here.</p>
  <div className="flex gap-2">
    <button className="bg-brand-600 text-white px-3 py-2 rounded-md">
      Action
    </button>
    <button className="border border-grey-300 text-grey-700 px-3 py-2 rounded-md">
      Cancel
    </button>
  </div>
</div>
```

### Example 4: Badge Component

```tsx
// Status badges using accent colors
<span className="bg-accent-green-light text-accent-green px-2 py-1 rounded-full text-xs font-medium">
  Active
</span>

<span className="bg-accent-yellow-light text-accent-orange px-2 py-1 rounded-full text-xs font-medium">
  Pending
</span>

<span className="bg-accent-red-light text-accent-red px-2 py-1 rounded-full text-xs font-medium">
  Cancelled
</span>
```

### Example 5: Input Field

```tsx
<div className="space-y-2">
  <label className="text-grey-700 font-medium text-sm">Email</label>
  <input
    type="email"
    className="w-full px-3 py-2 border border-grey-300 rounded-md
               focus:outline-none focus:ring-2 focus:ring-brand-500
               focus:border-brand-500"
    placeholder="you@example.com"
  />
  <p className="text-grey-500 text-xs">We'll never share your email.</p>
</div>
```

---

## Using CSS Variables Directly

If you need to use the variables in inline styles or JavaScript:

```tsx
// In inline styles
<div style={{ backgroundColor: "var(--brand-500)", color: "var(--grey-0)" }}>
  Custom styled div
</div>;

// In JavaScript
const brandColor = getComputedStyle(document.documentElement).getPropertyValue(
  "--brand-500",
);
```

---

## Quick Reference Cheat Sheet

### Common Patterns

**Primary Text:** `text-grey-900`
**Secondary Text:** `text-grey-600`
**Muted Text:** `text-grey-400`

**Card Background:** `bg-grey-0` or `bg-white`
**Page Background:** `bg-grey-50`
**Input Background:** `bg-white`

**Primary Button:** `bg-brand-600 hover:bg-brand-700 text-white`
**Secondary Button:** `bg-grey-200 hover:bg-grey-300 text-grey-900`

**Border:** `border-grey-300`
**Divider:** `border-t border-grey-200`

**Success:** `text-accent-green` or `bg-accent-green-light`
**Error:** `text-accent-red` or `bg-accent-red-light`
**Warning:** `text-accent-orange` or `bg-accent-yellow-light`

---

## Color Contrast Tips

✅ **Good Contrast:**

- `text-grey-900` on `bg-grey-0` (white)
- `text-grey-0` (white) on `bg-brand-600`
- `text-accent-red` on `bg-accent-red-light`

❌ **Poor Contrast (avoid):**

- `text-grey-400` on `bg-grey-50`
- `text-brand-300` on `bg-brand-200`

---

## Migration from Hex Codes

If you previously used hex codes, here's the mapping:

| Old Hex Code | New Class                                  |
| ------------ | ------------------------------------------ |
| `#ef4444`    | `text-accent-red` or `bg-accent-red`       |
| `#22c55e`    | `text-accent-green` or `bg-accent-green`   |
| `#3b82f6`    | `text-accent-blue` or `bg-accent-blue`     |
| `#f97316`    | `text-accent-orange` or `bg-accent-orange` |
| `#6b7280`    | `text-grey-500` or `bg-grey-500`           |
| `#1f2937`    | `text-grey-800` or `bg-grey-800`           |

---

## Best Practices

1. **Use semantic colors first** (success, error, warning, info) from shadcn
2. **Use brand colors** for primary actions and branding
3. **Use accent colors** for status indicators and highlights
4. **Use grey scale** for text hierarchy and neutral elements
5. **Maintain consistent spacing** between color shades (e.g., 100 → 200 → 300)

---

## Need Help?

- Check existing components in `/src/components` for examples
- shadcn variables (like `bg-primary`, `text-foreground`) work alongside these
- All colors automatically support dark mode if we implement it later
