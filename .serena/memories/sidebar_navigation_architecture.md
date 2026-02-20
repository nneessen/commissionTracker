# Sidebar Navigation Architecture

## Overview
The sidebar navigation is implemented in a single monolithic component: `src/components/layout/Sidebar.tsx` (1,012 lines).

## Component Structure

### Main Component
- **File**: `/Users/nickneessen/projects/commissionTracker/src/components/layout/Sidebar.tsx`
- **Type**: React Functional Component
- **Props**: `SidebarProps`
  - `isCollapsed: boolean` - controls expanded/collapsed state
  - `onToggleCollapse: () => void` - callback for collapse toggle
  - `userName?: string` - displays user name in header
  - `userEmail?: string` - displays user email in header
  - `onLogout?: () => void` - logout callback

### Type Definitions
```typescript
interface NavigationItem {
  icon: React.ElementType;
  label: string;
  href: string;
  permission?: PermissionCode;
  public?: boolean;
  subscriptionFeature?: FeatureKey;
  subscriptionFeatures?: FeatureKey[];
  superAdminOnly?: boolean;
  allowedEmails?: string[];
  allowedAgencyId?: string;
}

interface NavigationActionItem {
  icon: React.ElementType;
  label: string;
  type: "action";
  onClick?: () => void;
  colorClass?: string;
  permission?: PermissionCode;
  subscriptionFeature?: FeatureKey;
  subscriptionFeatures?: FeatureKey[];
  superAdminOnly?: boolean;
  allowedEmails?: string[];
  allowedAgencyId?: string;
  public?: boolean;
}

interface NavigationGroup {
  id: string;
  label: string;
  items: NavItem[];
  defaultCollapsed?: boolean;
  separatorAfter?: boolean;
}
```

## Navigation Structure

### Navigation Groups (Regular Users)
The sidebar is organized into 8+ collapsible sections:

1. **Main** (id: "main")
   - Dashboard (href: "/dashboard")
   - Analytics (href: "/analytics")
   - Targets (href: "/targets")
   - Reports (href: "/reports")

2. **Business** (id: "business")
   - Policies (href: "/policies")
   - Expenses (href: "/expenses")
   - Team (href: "/hierarchy")
   - Licenses/Writing #'s (href: "/the-standard-team")

3. **Growth** (id: "growth")
   - Recruiting (href: "/recruiting")
   - Leaderboard (href: "/leaderboard")
   - Lead Vendors (href: "/lead-vendors")

4. **Connect** (id: "connect", separatorAfter: true)
   - Messages (href: "/messages")
   - Community (href: "/community")

5. **Tools** (Conditional - if underwriting enabled)
   - UW Wizard (action: opens dialog)
   - Quick Quote (action: opens dialog)

6. **Training** (id: "training")
   - My Training (href: "/my-training")

7. **Admin** (id: "admin")
   - Admin (href: "/admin")

8. **System** (id: "system")
   - Workflows (href: "/system/workflows")

### Staff/Trainer Navigation Groups
For trainers/contracting managers:

1. **Main** (id: "staff-main")
   - Dashboard (href: "/trainer-dashboard")
   - Leaderboard (href: "/leaderboard")

2. **Work** (id: "staff-work")
   - Training Hub (href: "/training-hub")
   - Recruiting (href: "/recruiting")
   - Contracting (href: "/contracting")

3. **Connect** (id: "staff-connect")
   - Messages (href: "/messages")
   - Community (href: "/community")

### Recruit Navigation Groups
For recruits:

1. **Navigation** (id: "recruit")
   - My Progress (href: "/recruiting/my-pipeline")

## Tailwind CSS Classes

### Sidebar Container
- `fixed left-0 top-0 h-screen` - fixed positioning, full height
- `bg-card border-r border-border` - card background with right border
- `flex flex-col z-[100]` - flex layout, high z-index
- `transition-all duration-200` - smooth animations
- Width: `w-[72px]` (collapsed) or `w-[220px]` (expanded)

### Section Headers (Visible in Expanded Mode Only)
Location in code: Lines 899-916
```css
className: "mb-1 px-2 flex items-center justify-between cursor-pointer group"
/* + dynamic spacing: mt-3 (subsequent) or mt-1 (first) */

/* Section label text */
"text-[10px] font-medium uppercase text-muted-foreground/60 tracking-wider select-none"

/* Chevron icon */
"text-muted-foreground/40 transition-transform duration-200 group-hover:text-muted-foreground/60"
```

### Navigation Items (Regular Links)
Location in code: Lines 703-755

**Active State** (isActive = true):
```css
"relative flex items-center h-9 rounded-md text-sm transition-colors mb-0.5"
"w-full gap-2.5 px-3" /* expanded mode */
"w-9 justify-center mx-auto" /* collapsed mode */
"bg-accent/60 text-foreground" /* active bg + text color */

/* Left accent bar - 3px wide primary colored bar */
"absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary"

/* Active icon color */
Icon: "flex-shrink-0 text-primary"
```

**Inactive State**:
```css
"relative flex items-center h-9 rounded-md text-sm transition-colors mb-0.5"
"w-full gap-2.5 px-3" /* expanded mode */
"text-muted-foreground hover:text-foreground hover:bg-accent/40"

Icon: "flex-shrink-0"
```

**Collapsed State** (both active/inactive):
```css
"w-9 justify-center mx-auto" /* icon-only width + centering */
/* Wrapped in Tooltip with sideOffset={8} for hover labels */
```

### Action Items (UW Wizard, Quick Quote)
Location in code: Lines 665-701

```css
"relative flex items-center h-9 rounded-md text-sm transition-colors mb-0.5"
"w-full gap-2.5 px-3" /* expanded mode */
"w-9 justify-center mx-auto" /* collapsed mode */
actionItem.colorClass || "text-muted-foreground" /* custom color per action */
"hover:bg-accent/40"

/* Custom colors */
UW Wizard: "text-blue-600 dark:text-blue-400"
Quick Quote: "text-emerald-600 dark:text-emerald-400"
```

### Locked Items (Pending Users)
Location in code: Lines 620-663

```css
"relative flex items-center h-9 rounded-md cursor-not-allowed opacity-50 mb-0.5"
"w-full gap-2.5 px-3" /* expanded mode */
"w-9 justify-center mx-auto" /* collapsed mode */

Icon: "text-muted-foreground flex-shrink-0"
Label: "text-sm blur-[0.5px] text-muted-foreground truncate"
Lock badge: "absolute text-muted-foreground/70" 
           (bottom-0.5 right-0.5 when collapsed, 
            right-2 top-1/2 -translate-y-1/2 when expanded)
```

### Separators
Location in code: Lines 928-931 (collapsed) and standard footer separator

Between-group separators (only visible when sidebar collapsed):
```css
"my-1.5 mx-2 border-t border-border/50"
```

Footer separator:
```css
"my-1.5 mx-1 border-t border-border/50"
```

## Custom CSS (src/index.css, lines 360-371)

### Sidebar Scrollbar Styling
```css
.sidebar-nav {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.sidebar-nav:hover {
  scrollbar-color: var(--border) transparent;
}
.sidebar-nav::-webkit-scrollbar { width: 4px; }
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }
.sidebar-nav::-webkit-scrollbar-thumb { background: transparent; border-radius: 2px; }
.sidebar-nav:hover::-webkit-scrollbar-thumb { background: var(--border); }
```

The scrollbar is **hidden by default** and only appears on hover (transparent → var(--border)).

## Visual Hierarchy & Colors

### Color System (CSS Variables)
From `src/index.css`:

**Light Mode**:
- `--background: #f5f5f4` (subtle off-white)
- `--foreground: #18181b` (near-black text)
- `--card: #ffffff` (sidebar background)
- `--accent: #f4f4f5` (inactive nav items background on hover)
- `--primary: #18181b` (active bar color - left 3px bar)
- `--muted-foreground: #71717a` (section headers, inactive icons)
- `--border: #e4e4e7` (dividers, scrollbar on hover)

**Dark Mode**:
- `--background: #0a0a0a` (pure black)
- `--foreground: #f4f4f5` (off-white text)
- `--card: #131313` (sidebar background)
- `--accent: #27272a` (inactive nav items background on hover)
- `--primary: #fafaf9` (active bar color - left 3px bar)
- `--muted-foreground: #d4d4d8` (section headers, inactive icons)
- `--border: #27272a` (dividers, scrollbar on hover)

### Visual Hierarchy (from most to least muted)
1. **Section Headers**: 
   - Font size: `text-[10px]`
   - Weight: `font-medium`
   - Case: `uppercase`
   - Color: `text-muted-foreground/60` (most muted)
   - Spacing: `tracking-wider`

2. **Inactive Nav Items**:
   - Icon: `text-muted-foreground`
   - Text: `text-muted-foreground`
   - Background: transparent

3. **Inactive Item Hover State**:
   - Icon: `hover:text-foreground`
   - Text: `hover:text-foreground`
   - Background: `hover:bg-accent/40`

4. **Active Items**:
   - Icon: `text-primary`
   - Text: `text-foreground`
   - Background: `bg-accent/60`
   - Left bar: `w-[3px] rounded-full bg-primary` (hardest to miss)

## Layout Structure

### Header Section (Lines 796-879)
- User avatar with initials
- User name + email
- Organization info (IMO code + Agency code)
- Notification bell (expanded only)
- Collapse/Close button

### Navigation Section (Lines 881-935)
- Flex-1 scrollable container with `p-2 overflow-y-auto`
- Class: `sidebar-nav` (custom scrollbar styling)
- Notification bell (collapsed only)
- Collapsible section groups
- Section header + items container

### Footer Section (Lines 937-977)
- Billing & Settings links (static)
- Separator
- Theme toggle
- Logout button
- Responsive layout based on collapse state

## Key Features

### Collapsible Sections
- State persisted to localStorage: `sidebar-sections` (JSON)
- Each group can be independently collapsed/expanded
- Toggle handler: `toggleSection(groupId)` (line 164-170)
- Auto-expand when navigating to a route in that section (effect at lines 570-588)
- Only visible in expanded mode (hidden when sidebar collapsed)

### Mobile Behavior (Lines 592-605)
- Responsive breakpoint: 768px
- Mobile overlay with `bg-background/90 backdrop-blur-sm`
- Menu button: hamburger icon (fixed top-left)
- Wider on mobile: `w-[280px]` vs `w-[220px]`
- Closes when item clicked or overlay clicked
- Z-index structure: overlay z-[99], sidebar z-[100], button z-[101]

### Permission & Feature Gating
- Items filtered based on user permissions (lines 496-546)
- Subscription feature checks: `hasFeature()` (line 182-192)
- Email allowlist support: `allowedEmails[]`
- Agency ID restrictions: `allowedAgencyId`
- Super-admin only items: `superAdminOnly`
- Pending user lockout with tooltip explanation (isPending state)
- 3 filter functions: `filterRegularItem`, `filterStaffItem`, and recruit-specific

### Item Types
1. **Link Items**: Regular navigation (filtered based on permissions)
2. **Action Items**: Buttons that trigger modals/dialogs (UW Wizard, Quick Quote)
3. **Locked Items**: Disabled for pending users (visible but non-functional)

### State Management
- Collapse state: Component prop (`isCollapsed`)
- Mobile state: Internal state (`isMobileOpen`)
- Section collapse: localStorage `sidebar-sections`
- Active route: TanStack Router `useLocation()`
- Loading states: Various hooks (permissions, subscriptions, IMO)
- Permission checks: `usePermissionCheck()` hook

## Footer Elements
- **Billing Link**: Always visible (public nav item)
- **Settings Link**: Always visible (public nav item)
- **Theme Toggle**: Always visible (responsive)
- **Logout Button**: Always visible (responsive)

## Dependencies
- `lucide-react` icons (32 icons imported)
- `@tanstack/react-router` (Link, useLocation)
- `@radix-ui` (Tooltip, TooltipContent, TooltipTrigger)
- Custom hooks: usePermissionCheck, useUserRoles, useSubscription, useOwnerDownlineAccess, etc.
- Toast notifications: `sonner`
- Features: UnderwritingWizard, QuickQuoteDialog from underwriting module

## Responsive Breakpoints
- Mobile: max-width 768px
- Expanded width: 220px
- Collapsed width: 72px
- Mobile expanded width: 280px

## Main Content Margin
Lines 997-1008: Dynamic `.main-content` CSS class
- Expanded: `margin-left: 220px`
- Collapsed: `margin-left: 72px`
- Mobile: `margin-left: 0`
- Transition: `0.2s ease`

## Code Organization
1. **Types** (lines 63-101): NavigationItem, NavigationActionItem, NavigationGroup
2. **Static Data** (lines 113-116): Footer nav items
3. **Main Component** (lines 120-126): Function declaration and props
4. **State & Hooks** (lines 127-150): Initialization of all state and hook calls
5. **Section State** (lines 152-170): Collapsible sections with localStorage
6. **Auth Helpers** (lines 172-215): Permission checking, role checking, email checks
7. **Navigation Groups** (lines 219-477): regularGroups, staffGroups, recruitGroups definitions
8. **Item Filtering** (lines 495-566): filterRegularItem, filterStaffItem functions
9. **Auto-expand Effect** (lines 570-588): useEffect for route changes
10. **Mobile Handling** (lines 592-605): Mobile detection and state
11. **Render Helpers** (lines 615-755): renderNavItem function with 3 variants
12. **JSX** (lines 759-1010): Full sidebar JSX structure
