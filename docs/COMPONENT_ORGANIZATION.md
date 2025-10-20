# Component Organization

**Last Updated**: 2025-01-20

## Directory Structure

```
src/components/
├── ui/                    # Official shadcn/ui components ONLY
│   ├── alert.tsx
│   ├── alert-dialog.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── calendar.tsx
│   ├── card.tsx
│   ├── chart.tsx
│   ├── command.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── empty.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── popover.tsx
│   ├── scroll-area.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── sonner.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   └── index.ts
│
└── custom_ui/             # Custom business components
    ├── ChartCard.tsx
    ├── DataTable.tsx
    ├── EmailIcon.tsx
    ├── InfoButton.tsx
    ├── MetricsCard.tsx
    ├── MetricTooltip.tsx
    ├── StatCard.tsx
    ├── TimePeriodSelector.tsx
    ├── Heading.tsx
    └── index.ts
```

## Rules

### src/components/ui/ (Official shadcn Components)
- **ONLY** official shadcn/ui components
- Must match components from https://ui.shadcn.com/docs/components
- File naming: kebab-case (e.g., `alert-dialog.tsx`, `select.tsx`)
- No custom business logic
- Direct imports: `import { Button } from '@/components/ui/button'`
- Barrel export available: `import { Button } from '@/components/ui'`

### src/components/custom_ui/ (Custom Business Components)
- **ALL** custom application-specific components
- Can extend or wrap shadcn components
- File naming: PascalCase or kebab-case (both acceptable)
- Contains business logic
- Direct imports: `import { MetricsCard } from '@/components/custom_ui/MetricsCard'`
- Barrel export available: `import { MetricsCard } from '@/components/custom_ui'`

## Import Patterns

### Correct Imports
```tsx
// shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

// Custom components
import { DataTable } from '@/components/custom_ui/DataTable';
import { MetricsCard } from '@/components/custom_ui/MetricsCard';
import { TimePeriodSelector } from '@/components/custom_ui/TimePeriodSelector';
```

### Incorrect Imports (DO NOT USE)
```tsx
// ❌ Wrong - Modal doesn't exist, use Dialog
import { Modal } from '@/components/ui/modal';

// ❌ Wrong - DataTable is custom, not shadcn
import { DataTable } from '@/components/ui/DataTable';

// ❌ Wrong - MetricsCard is custom
import { MetricsCard } from '@/components/ui/MetricsCard';
```

## Recent Cleanup (2025-01-20)

### Removed Duplicates
- ❌ `ui/Input.tsx` (PascalCase) - Was duplicate of `ui/input.tsx`
- ❌ `custom_ui/Modal.tsx` - Use shadcn Dialog instead
- ❌ `custom_ui/empty-state.tsx` - Use shadcn Empty instead
- ❌ `custom_ui/Alert.tsx` - Never existed, was broken export

### Moved Files
- ✅ `custom_ui/Select.tsx` → `ui/select.tsx` (was official shadcn component in wrong location)

### Deprecated Files
- `features/commissions/CommissionForm.tsx.OLD` - Old unused component
- `features/commissions/CommissionList.tsx.OLD` - Old unused component

## Adding New Components

### Adding shadcn Component
1. Install via CLI: `npx shadcn@latest add [component-name]`
2. Verify it's in `src/components/ui/`
3. Add to barrel export in `src/components/ui/index.ts` if needed

### Adding Custom Component
1. Create in `src/components/custom_ui/`
2. Use PascalCase or kebab-case naming
3. Add to barrel export in `src/components/custom_ui/index.ts`
4. Import shadcn components as needed

## Common Patterns

### Using shadcn Input with Label
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
  {error && <p className="text-sm text-red-500">{error}</p>}
</div>
```

### Using shadcn Empty Component
```tsx
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';

<Empty>
  <EmptyHeader>
    <EmptyTitle>No data found</EmptyTitle>
    <EmptyDescription>Try adjusting your filters</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button onClick={onReset}>Reset Filters</Button>
  </EmptyContent>
</Empty>
```

### Using Custom DataTable
```tsx
import { DataTable } from '@/components/custom_ui/DataTable';

<DataTable
  data={policies}
  columns={columns}
  loading={isLoading}
  emptyMessage="No policies found"
  onRowClick={handleRowClick}
/>
```

## Troubleshooting

### Build Error: "Could not resolve..."
- Check if component is in correct directory (ui/ vs custom_ui/)
- Verify import path matches file location
- Check barrel export in index.ts

### TypeScript Error: "Property does not exist"
- Verify you're using correct component (shadcn vs custom)
- Check component props interface
- shadcn components use standard HTML props only

### Component Not Found
- Run `npm run typecheck` to find import errors
- Check if component was moved or renamed
- Verify barrel exports are updated
