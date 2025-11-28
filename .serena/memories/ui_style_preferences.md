# User's UI Style Preferences (CRITICAL - ALWAYS FOLLOW)

## Core Rule: **COMPACT AND DATA-DENSE**

User prefers **compact, information-dense UIs** that fit more content on screen. This is a **NON-NEGOTIABLE** requirement documented in CLAUDE.md.

## Font Sizes (NEVER GO LARGER)

### Table Content
- **Headers**: `text-[11px]` (11px)
- **Body text**: `text-[11px]` (11px)
- **Metadata/secondary**: `text-[10px]` (10px)
- **Badges/labels**: `text-[10px]` (10px)

### Dialogs/Modals
- **Dialog title**: `text-sm` (14px) - max allowed
- **Dialog description**: `text-[10px]` (10px)
- **Form labels**: `text-[11px]` (11px)
- **Input text**: `text-[11px]` (11px)
- **Helper text**: `text-[10px]` (10px)
- **Button text**: `text-[10px]` (10px)

### General UI
- **Page titles**: `text-xl` (20px) - max allowed
- **Section headers**: `text-sm` (14px)
- **Body text**: `text-[11px]` or `text-xs` (12px max)

## Spacing (MINIMIZE PADDING)

### Tables
- **Row padding**: `py-1.5` (6px vertical)
- **Cell padding**: Built into `py-1.5` from TableRow
- **Header height**: `h-8` (32px)
- **Cell content gap**: `gap-1.5` (6px)

### Dialogs
- **Dialog container**: `p-3` (12px)
- **Dialog header**: `space-y-1` (4px between title/description)
- **Content sections**: `py-2 space-y-2` (8px padding, 8px gap)
- **Form fields**: `space-y-1` (4px gap)
- **Footer**: `gap-1 pt-2` (4px button gap, 8px top padding)

### Buttons
- **Small buttons**: `h-5 px-1.5` or `h-6 px-2`
- **Icon buttons**: `h-5 w-5` with `h-3 w-3` icons
- **Button gap in groups**: `gap-1` (4px)

### Cards/Containers
- **Card padding**: `p-2` or `p-3` (8-12px)
- **Section spacing**: `space-y-2` (8px)
- **Item spacing**: `gap-1.5` or `gap-2` (6-8px)

## Component-Specific Rules

### Tables (Data-Dense Business Style)
```tsx
// Headers
className="h-8 text-[11px] font-semibold"

// Rows
className="py-1.5"

// Cell content
className="text-[11px]"

// Metadata
className="text-[10px] text-muted-foreground"

// Badges
className="text-[10px] h-4 px-1"

// Avatars
className="h-5 w-5"
```

### Dialogs
```tsx
// Container
<DialogContent className="max-w-md p-3">

// Header
<DialogTitle className="text-sm font-semibold">
<DialogDescription className="text-[10px]">

// Section labels
className="text-[11px] font-semibold text-muted-foreground uppercase"

// Form inputs
className="text-[11px] h-7"

// Buttons
className="h-6 text-[10px]"
```

### Action Buttons
```tsx
// With text labels
<Button size="sm" className="h-5 px-1.5 text-[10px]">
  <Icon className="h-3 w-3 mr-0.5" />
  Label
</Button>

// Icon only
<Button size="sm" className="h-5 px-1.5">
  <Icon className="h-3 w-3" />
</Button>
```

## What User HATES

### ❌ NEVER DO THESE:
1. **Large font sizes** - Anything above `text-sm` (14px) for UI elements
2. **Excessive padding** - More than `p-4` (16px) on containers
3. **Huge dialogs** - Default shadcn dialog sizes are TOO BIG
4. **Big buttons** - Default button sizes waste space
5. **Giant icons** - Icons should be `h-3 w-3` or `h-4 w-4` max in most cases
6. **Wasted whitespace** - Every pixel should serve a purpose
7. **Cards within cards** - Nested cards create visual clutter
8. **Unlabeled icon buttons** - All actions should have text labels (even if tiny)

### ✅ ALWAYS DO THESE:
1. **Compact everything** - Make it data-dense like a spreadsheet
2. **Small, clear labels** - Use `text-[10px]` or `text-[11px]` labels on all buttons
3. **Efficient spacing** - `gap-1` or `gap-1.5` for most element groups
4. **Sticky headers** - Tables should have `sticky top-0` headers
5. **Professional business aesthetics** - Think Excel/Google Sheets, not consumer apps
6. **Information density** - Fit as much data on screen as possible without cluttering

## Design Philosophy

> "Professional business application" NOT "consumer app"

Think:
- Bloomberg Terminal (data-dense)
- Excel (compact, functional)
- IDE code editors (every pixel used efficiently)

NOT:
- Modern "friendly" UIs with lots of whitespace
- Consumer apps with big friendly buttons
- Marketing websites with hero sections

## Common Violations to Avoid

### Before (BAD):
```tsx
<Dialog>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle className="text-2xl">Edit User</DialogTitle>
      <DialogDescription className="text-base">
        Modify user details below
      </DialogDescription>
    </DialogHeader>
    <div className="py-6 space-y-6">
      <div className="space-y-4">
        <Label className="text-base">Role</Label>
        <Checkbox className="h-5 w-5" />
      </div>
    </div>
    <DialogFooter className="gap-3">
      <Button size="lg">Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### After (GOOD):
```tsx
<Dialog>
  <DialogContent className="max-w-md p-3">
    <DialogHeader className="space-y-1">
      <DialogTitle className="text-sm font-semibold">Edit User</DialogTitle>
      <DialogDescription className="text-[10px]">
        {user.email}
      </DialogDescription>
    </DialogHeader>
    <div className="py-2 space-y-1">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold">Roles</div>
        <Checkbox className="h-3 w-3" />
      </div>
    </div>
    <DialogFooter className="gap-1 pt-2">
      <Button size="sm" className="h-6 text-[10px]">Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Key Metrics for "Compact Enough"

- Can you fit 50-100 table rows on a 1080p screen? ✅
- Are dialog buttons under 28px tall? ✅
- Is body text 11-12px? ✅
- Are icons 12-16px (h-3 to h-4)? ✅
- Is padding under 12px for most elements? ✅

If YES to all → Probably compact enough
If NO to any → Make it smaller

## Remember

**User explicitly states in CLAUDE.md:**
> "Stop making things so damn big!"

This means: When in doubt, **GO SMALLER**.
