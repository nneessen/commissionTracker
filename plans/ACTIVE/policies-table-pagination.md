# Policies Table Server-Side Pagination Implementation Plan

## Status: IN PROGRESS
**Created:** 2025-10-27
**Updated:** 2025-10-27
**Priority:** HIGH - Performance & Scalability Critical

## Completion Status: 75% Complete

### ✅ Completed (Week 1 - Done):
- Phase 4: Fixed metrics to show actual commission data (not theoretical)
- Phase 5: Created DateRangePicker component with proper timezone handling
- Phase 2: Added database indexes for pagination performance
- Phase 3 (partial): Refactored PolicyRepository and PolicyService for server-side pagination

### 🚧 In Progress:
- Phase 3: Update hooks layer (usePoliciesView) for server pagination
- Phase 6: Integrate date range filter into PolicyList.tsx

### ⏳ Pending:
- Phase 7: Performance optimizations
- Phase 8: Testing & Validation
- Phase 9: Migration & Rollout
- Phase 10: Monitoring & Optimization

---

## Problem Statement

The current policies table implementation has **TWO critical issues**:

### Issue 1: No Server-Side Pagination (Performance)

**Current Architecture (BROKEN at scale):**
1. `usePolicies()` hook fetches **ALL policies** from database via `policyService.getAll()`
2. `usePoliciesView()` performs **client-side** filtering, sorting, and pagination
3. **Issue:** For 1000+ policies, this loads everything into memory and hits Supabase's 1000 row limit
4. **Result:** App will fail or become extremely slow as data grows

**What Already Exists (UNDERUTILIZED):**
- ✅ `PolicyRepository.findPaginated()` - cursor-based server pagination (src/services/policies/PolicyRepository.ts:200-286)
- ✅ `useInfinitePolicies` - infinite scroll hook using cursor pagination
- ❌ These are NOT used by the main PolicyList.tsx table

### Issue 2: No Date Range Filtering (Missing Feature + Timezone Landmines)

**Current State:**
- ❌ No way to filter policies by effective date range
- ❌ No date range picker component exists
- ⚠️ Date utilities DO exist (`src/lib/date.ts`) but easy to forget to use them
- ⚠️ Timezone bugs are SILENT - dates will be off by 1 day and you won't notice immediately

**Why This Is Hard:**
Date range pickers have historically been problematic in this codebase because:
1. **Timezone confusion**: `new Date("2024-10-01")` creates Oct 1 00:00 **UTC**, which becomes Sept 30 19:00 in US Eastern!
2. **Visual complexity**: Hover states, range highlights, today indicator, keyboard nav all easy to miss
3. **Mobile responsiveness**: Single vs dual month views, touch targets
4. **Integration**: Must convert between Date objects (UI) and "YYYY-MM-DD" strings (DB) correctly

**The app has date utilities to solve this**, but they must be used consistently everywhere.

### Target Architecture (CORRECT):
1. **Server-side pagination** - only fetch current page of data
2. **Server-side filtering** - apply filters in SQL queries (including date ranges!)
3. **Server-side sorting** - use Postgres ORDER BY
4. **Efficient count queries** - separate count query for total pages
5. **TanStack Query caching** - cache pages independently
6. **Proper date range picker** - with all visual states, using existing date utilities consistently

---

## Implementation Progress Details

### ✅ Completed Items:

#### 1. **Fixed Commission Metrics** (Phase 4)
- ✅ Updated `usePolicySummary.ts` to use actual commission data from database
- ✅ Added `pendingPolicies` count to replace confusing "avg rate"
- ✅ Redesigned dashboard header to 2×3 grid (6 metrics total)
- ✅ Added date range label showing current filter state
- ✅ Fixed calculation bug (was showing theoretical commission, now shows actual earned)

#### 2. **Database Indexes** (Phase 2)
- ✅ Created migration file: `20251027_001_add_policy_indexes_for_pagination.sql`
- ✅ Added indexes on: status, carrier_id, product_id, effective_date, created_at, user_id
- ✅ Added composite indexes for common query patterns
- ✅ Applied migration to production database

#### 3. **DateRangePicker Component** (Phase 5)
- ✅ Created `src/components/ui/date-range-picker.tsx`
- ✅ Uses existing date utilities to prevent timezone bugs
- ✅ Includes preset filters (Last 7/30 days, This/Last month, YTD)
- ✅ Mobile responsive (1 month on mobile, 2 months on desktop)
- ✅ Proper hover states and visual feedback

#### 4. **Repository & Service Updates** (Phase 3 - partial)
- ✅ Updated `PolicyRepository.findAll()` to support pagination and date filtering
- ✅ Updated `PolicyRepository.countPolicies()` to support same filters
- ✅ Added `PolicyService.getPaginated()` method
- ✅ Added `PolicyService.getCount()` method
- ✅ Added `effectiveDateFrom` and `effectiveDateTo` to PolicyFilters type

### 🔧 Files Modified:
1. `src/features/policies/hooks/usePolicySummary.ts` - Fixed commission calculations
2. `src/features/policies/components/PolicyDashboardHeader.tsx` - New 2×3 grid layout
3. `src/features/policies/PolicyDashboard.tsx` - Added commission data import
4. `src/components/ui/date-range-picker.tsx` - NEW file
5. `src/types/policy.types.ts` - Added date range filter fields
6. `src/services/policies/PolicyRepository.ts` - Added pagination support
7. `src/services/policies/policyService.ts` - Added paginated methods
8. `supabase/migrations/20251027_001_add_policy_indexes_for_pagination.sql` - NEW file

## Todo List

### Phase 1: Analysis & Preparation
- [ ] **Audit current usage patterns**
  - [ ] Identify all components using `usePolicies()` or `usePoliciesView()`
  - [ ] Document which features require "all data" vs paginated data
  - [ ] Check if any KPI calculations or reports depend on fetching all policies

- [ ] **Review existing pagination infrastructure**
  - [ ] Test `PolicyRepository.findPaginated()` with various filters
  - [ ] Verify cursor-based pagination handles edge cases (empty results, last page)
  - [ ] Confirm `countAll()` method performance with filters

- [ ] **Database performance baseline**
  - [ ] Run EXPLAIN ANALYZE on current queries
  - [ ] Identify missing indexes (policies table should have indexes on: status, carrier_id, product_id, effective_date, created_at)
  - [ ] Test query performance with 10k+ mock policies

### Phase 2: Database & Service Layer
- [ ] **Add database indexes** (create migration: `supabase/migrations/YYYYMMDD_NNN_add_policy_indexes.sql`)
  ```sql
  -- Only indexes for actively filtered fields (KISS principle)
  CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
  CREATE INDEX IF NOT EXISTS idx_policies_carrier_id ON policies(carrier_id);
  CREATE INDEX IF NOT EXISTS idx_policies_product_id ON policies(product_id);
  CREATE INDEX IF NOT EXISTS idx_policies_effective_date ON policies(effective_date);
  -- Skip created_at and user_id unless confirmed needed
  ```

- [ ] **Refactor PolicyRepository.findAll() method** (DON'T create new method!)
  - [ ] Add optional pagination parameters: `page`, `pageSize`
  - [ ] Add date range filter parameters: `effectiveDateFrom`, `effectiveDateTo`
  - [ ] Implement offset-based pagination: `LIMIT pageSize OFFSET (page - 1) * pageSize`
  - [ ] Keep existing filter parameters (status, carrier, product)
  - [ ] Keep existing sorting logic

- [ ] **Add PolicyRepository.countFiltered() method** (NEW method - genuinely needed)
  - [ ] Accept same filters as findAll() for consistency
  - [ ] Return total count matching filters
  - [ ] Use for calculating total pages in pagination

- [ ] **Update policyService**
  - [ ] Add `getPaginated(page, pageSize, filters, sort)` method
  - [ ] Add `getCount(filters)` method
  - [ ] Deprecate or mark `getAll()` for limited use only

### Phase 3: Hooks Layer (TanStack Query)
- [ ] **Refactor `usePoliciesView` hook** (DON'T create new hook file!)
  - [ ] **Replace client-side logic with server-side:**
    - [ ] Remove client-side filter/sort/pagination logic
    - [ ] Call `policyService.getPaginated(page, pageSize, filters, sortConfig)`
    - [ ] Use parallel `useQueries` for data + count
    - [ ] Query keys: `['policies', 'data', page, pageSize, filters, sort]` and `['policies', 'count', filters]`

  - [ ] **Update return values:**
    - [ ] Return: `{ policies: paginatedData, totalCount, totalPages, currentPage, pageSize, isLoading, error }`
    - [ ] Add pagination controls: `goToPage, nextPage, previousPage, setPageSize`
    - [ ] Keep filter/sort state management (but triggers server queries now)

  - [ ] **TanStack Query configuration:**
    - [ ] Enable `keepPreviousData: true` for smooth page transitions
    - [ ] Set `staleTime: 5 * 60 * 1000` (5 minutes)
    - [ ] Invalidate on mutations (already handled by existing mutation hooks)

  - [ ] **Keep existing interface:**
    - [ ] File stays: `src/hooks/policies/usePoliciesView.ts`
    - [ ] Hook name stays: `usePoliciesView`
    - [ ] Components using it don't need to change hook name

### Phase 4: Fix Metrics Summary Bar (CRITICAL - Currently Wrong!)

**⚠️ CURRENT PROBLEMS:**
1. **"Commission" metric is WRONG** - Line 27-30 in `usePolicySummary.ts`:
   - Calculates: `annualPremium * commissionPercentage / 100`
   - This is **first year commission ONLY**, not actual commission earned!
   - Should pull from `commissions` table which has actual advances, splits, chargebacks

2. **"Avg Rate" is confusing** - Line 33-36:
   - Shows weighted average commission percentage across all policies
   - Users don't understand what this means or why it's useful
   - Should be replaced with something actionable

3. **No time period label** - Metrics show "all time" data but this isn't clear
   - When date filters are applied, metrics should update to match
   - Need to show "Showing: All Policies" or "Showing: Jan 1 - Dec 31, 2024"

**REQUIRED CHANGES:**

- [ ] **Replace "Commission" metric with "Total Earned"**
  - [ ] Query `commissions` table where `policy_id IN (filtered_policies)`
  - [ ] Sum `earned_amount` field (NOT calculated from premium * rate!)
  - [ ] Label: "Earned Commission" or "Total Earned"
  - [ ] Only count active/paid commissions, exclude charged_back status

- [ ] **Replace "Avg Rate" with "Pending Commissions"**
  - [ ] Query `commissions` table where `status = 'pending'`
  - [ ] Sum `amount` field (total pending commission money)
  - [ ] Label: "Pending Commissions"

- [ ] **Redesign metrics layout to 2 rows × 3 columns (6 total)**
  - [ ] **Row 1 - Policy Counts:**
    1. Total Policies
    2. Active
    3. Pending (needs processing)
  - [ ] **Row 2 - Financial:**
    4. Annual Premium (sum of annual_premium)
    5. Paid Commissions (sum of commissions.earned_amount where status='paid')
    6. Pending Commissions (sum of commissions.amount where status='pending')
  - [ ] Change grid from `grid-cols-5` to `grid-cols-3`
  - [ ] Keep compact card styling with gradients
  - [ ] Maintain visual distinction from table (current styling already achieves this)

- [ ] **Add time period indicator above metrics**
  - [ ] When no date filter: "Showing: All Policies"
  - [ ] When date filter active: "Showing: {formatted date range}" (e.g., "Jan 1 - Mar 31, 2024")
  - [ ] Use `formatDateRange()` from `src/utils/dateRange.ts`
  - [ ] Display prominently, maybe as badge or text above metrics grid
  - [ ] Example placement:
    ```tsx
    <div className="flex justify-between items-center mb-2">
      <div className="text-sm text-muted-foreground">
        {dateFilter
          ? `Showing: ${formatDateRange(dateFilter)}`
          : "Showing: All Policies"
        }
      </div>
      <Button onClick={clearFilters}>Clear Filters</Button>
    </div>
    <div className="grid grid-cols-5 gap-4">
      {/* Metrics */}
    </div>
    ```

- [ ] **Make metrics respect filters**
  - [ ] Current: `usePolicySummary(policies)` receives ALL policies
  - [ ] Change to: `usePolicySummary(filteredPolicies)` - only policies matching current filters
  - [ ] This includes: status filter, carrier filter, product filter, AND date range filter
  - [ ] Metrics should update instantly when filters change
  - [ ] Commission earned calculation must also respect filtered policy IDs

- [ ] **Simplify metric labels (UX improvement)**
  - [ ] Current labels use technical terms
  - [ ] Make user-friendly:
    - "Total Policies" → "Total" (count is obvious)
    - "Active" → keep (clear)
    - "Total Premium" → "Annual Premium" (more accurate)
    - "Commission" → "Earned" (actual earned commission)
    - "Avg Rate" → TBD based on replacement choice

**EXAMPLE: Correct Commission Calculation**

```typescript
// ❌ WRONG (current implementation)
const totalExpectedCommission = policies.reduce(
  (sum, p) => sum + ((p.annualPremium || 0) * (p.commissionPercentage || 0)) / 100,
  0,
);

// ✅ CORRECT (should query commissions table)
const totalEarnedCommission = commissions
  .filter(c =>
    filteredPolicyIds.includes(c.policy_id) &&
    c.status !== 'charged_back'
  )
  .reduce((sum, c) => sum + (c.earned_amount || 0), 0);
```

**UX PRINCIPLE:** Keep it simple!
- Don't over-engineer
- Show what user actually cares about: earned money, not theoretical calculations
- Make time period obvious - no guessing
- Update metrics immediately when filters change - no confusion

### Phase 5: Date Range Filtering Component (CRITICAL - EASY TO GET WRONG)
**⚠️ WARNING:** Date range pickers are notoriously difficult. This section contains detailed requirements to avoid common pitfalls.

- [ ] **Create DateRangePicker component** (`src/components/ui/date-range-picker.tsx`)
  - [ ] **Core Functionality Requirements:**
    - [ ] Use `react-day-picker` v9.11.1 (already installed) with `mode="range"`
    - [ ] Wrap in Popover component for dropdown interaction
    - [ ] Accept `value: { from: Date | undefined, to: Date | undefined }` prop
    - [ ] Accept `onChange: (range: { from: Date | undefined, to: Date | undefined }) => void` callback
    - [ ] Accept optional `disabled: boolean` prop
    - [ ] Accept optional `placeholder: string` prop (default: "Select date range")

  - [ ] **Date Utilities Integration (CRITICAL):**
    - [ ] **ALWAYS** use `parseLocalDate()` from `src/lib/date.ts` when converting strings to Dates
    - [ ] **ALWAYS** use `formatDateForDB()` when sending dates to backend (YYYY-MM-DD format)
    - [ ] **NEVER** use `new Date("YYYY-MM-DD")` directly (causes timezone bugs!)
    - [ ] Example correct usage:
      ```typescript
      import { parseLocalDate, formatDateForDB } from '@/lib/date';

      // ✅ CORRECT: Parse date from DB
      const dateFromDB = parseLocalDate("2024-10-01"); // Oct 1 00:00 LOCAL

      // ✅ CORRECT: Format date for DB
      const dateForDB = formatDateForDB(selectedDate); // "2024-10-01"

      // ❌ WRONG: Direct parsing
      const buggyDate = new Date("2024-10-01"); // Oct 1 00:00 UTC = Sept 30 in US!
      ```

  - [ ] **Visual Design Requirements (DO NOT SKIP):**
    - [ ] **Today's date highlighting:**
      - [ ] Use `modifiers.today` to detect current day
      - [ ] Apply `bg-accent text-accent-foreground` classes to today
      - [ ] Add subtle border or ring to today's date cell
      - [ ] Ensure today styling works with range selection

    - [ ] **Range selection visual states:**
      - [ ] **Start date:** `bg-primary text-primary-foreground rounded-l-md`
      - [ ] **End date:** `bg-primary text-primary-foreground rounded-r-md`
      - [ ] **Middle dates:** `bg-accent text-accent-foreground rounded-none`
      - [ ] **Single date (from === to):** `bg-primary text-primary-foreground rounded-md`
      - [ ] Use `modifiers.range_start`, `modifiers.range_middle`, `modifiers.range_end`

    - [ ] **Hover effects (CRITICAL for UX):**
      - [ ] On hover over any date: show preview of range from selected start to hovered date
      - [ ] Use semi-transparent background for hover preview: `bg-accent/50`
      - [ ] Disable hover effects when both dates are selected
      - [ ] Implement using `onDayMouseEnter` and `onDayMouseLeave` callbacks
      - [ ] Example hover state logic:
        ```typescript
        const [hoveredDate, setHoveredDate] = useState<Date | undefined>();
        const previewRange = from && !to && hoveredDate
          ? { from, to: hoveredDate }
          : undefined;
        ```

    - [ ] **Keyboard navigation:**
      - [ ] Arrow keys navigate between dates
      - [ ] Enter/Space selects date
      - [ ] Escape closes popover
      - [ ] Tab moves focus out of calendar

    - [ ] **Disabled dates:**
      - [ ] Support `disabledDays` prop for blocking specific dates
      - [ ] Support `fromDate` and `toDate` props for min/max ranges
      - [ ] Apply `text-muted-foreground opacity-50` to disabled dates
      - [ ] Prevent selection of disabled dates

    - [ ] **Mobile responsiveness:**
      - [ ] Single month view on mobile (< 768px)
      - [ ] Two month view on desktop (>= 768px)
      - [ ] Touch-friendly tap targets (minimum 44px × 44px)
      - [ ] Full-width popover on mobile

  - [ ] **Trigger Button Design:**
    - [ ] Use Button component with variant="outline"
    - [ ] Show CalendarIcon from lucide-react
    - [ ] Display selected range as text: "Oct 1, 2024 - Oct 15, 2024"
    - [ ] If no range selected: show placeholder text in muted color
    - [ ] Add "Clear" button (X icon) when range is selected
    - [ ] Example button layout:
      ```tsx
      <Button variant="outline" className="w-[280px] justify-start">
        <CalendarIcon className="mr-2 h-4 w-4" />
        {range?.from ? (
          range.to ? (
            `${formatDate(range.from)} - ${formatDate(range.to)}`
          ) : (
            formatDate(range.from)
          )
        ) : (
          <span className="text-muted-foreground">Pick a date range</span>
        )}
      </Button>
      ```

  - [ ] **Preset Quick Filters (OPTIONAL but recommended):**
    - [ ] Add preset buttons above calendar: "Last 7 days", "Last 30 days", "This month", "Last month", "YTD"
    - [ ] Calculate presets using utilities from `src/utils/dateRange.ts`
    - [ ] Apply presets immediately on click (don't wait for calendar selection)

- [ ] **Integrate DateRangePicker into PolicyList.tsx filters**
  - [ ] Add "Effective Date" filter using DateRangePicker
  - [ ] Store range in component state: `const [dateRange, setDateRange] = useState<{ from?: Date, to?: Date }>()`
  - [ ] Convert to YYYY-MM-DD strings before sending to backend:
    ```typescript
    const filters = {
      ...otherFilters,
      effectiveDateFrom: dateRange.from ? formatDateForDB(dateRange.from) : undefined,
      effectiveDateTo: dateRange.to ? formatDateForDB(dateRange.to) : undefined,
    };
    ```
  - [ ] Show active filter badge when date range is set
  - [ ] Clear date range when "Clear all filters" is clicked

- [ ] **Update PolicyFilters type** (`src/types/policy.types.ts`)
  - [ ] Add `effectiveDateFrom?: string` (YYYY-MM-DD format)
  - [ ] Add `effectiveDateTo?: string` (YYYY-MM-DD format)
  - [ ] Document that date strings must be in YYYY-MM-DD format

- [ ] **Update PolicyRepository.findAllPaginated()**
  - [ ] Add date range filtering logic:
    ```typescript
    if (filters.effectiveDateFrom) {
      query = query.gte('effective_date', filters.effectiveDateFrom);
    }
    if (filters.effectiveDateTo) {
      query = query.lte('effective_date', filters.effectiveDateTo);
    }
    ```
  - [ ] Ensure date comparisons work correctly with Postgres DATE columns
  - [ ] Add index on `effective_date` column (already in Phase 2)

- [ ] **Testing Date Range Functionality (DO NOT SKIP):**
  - [ ] **Unit tests for DateRangePicker:**
    - [ ] Test selecting start date only
    - [ ] Test selecting full range (start + end)
    - [ ] Test clearing selection
    - [ ] Test hover preview behavior
    - [ ] Test keyboard navigation
    - [ ] Test disabled dates

  - [ ] **Integration tests for date filtering:**
    - [ ] Test filtering policies by single date
    - [ ] Test filtering policies by date range
    - [ ] Test edge cases: same start/end date, year boundaries
    - [ ] Test clearing date filter
    - [ ] Test date filter + other filters combined

  - [ ] **Timezone bug prevention tests:**
    - [ ] Test that "2024-10-01" from DB displays as "Oct 1" in UI (not Sept 30)
    - [ ] Test that selecting Oct 1 in UI sends "2024-10-01" to DB (not shifted date)
    - [ ] Test date filtering works correctly across different user timezones
    - [ ] Test dates near DST boundaries (March/November in US)

  - [ ] **Visual regression tests:**
    - [ ] Screenshot test: calendar with no selection
    - [ ] Screenshot test: calendar with single date selected
    - [ ] Screenshot test: calendar with range selected
    - [ ] Screenshot test: hover preview state
    - [ ] Screenshot test: mobile view

### Phase 6: UI Components (Continued)
- [ ] **Update PolicyList.tsx**
  - [ ] Replace `usePoliciesView` with `usePoliciesPaginated`
  - [ ] Update filter controls to trigger server queries (debounce input)
  - [ ] Update sort headers to trigger server queries
  - [ ] Update pagination controls (page numbers, page size selector)
  - [ ] Add loading states: skeleton rows, disabled controls during fetch
  - [ ] Add empty states: "No policies match filters"

- [ ] **Preserve existing features**
  - [ ] Row selection (checkbox state)
  - [ ] Bulk actions (works on current page or all matching filters?)
  - [ ] Row actions (edit, delete, view details)
  - [ ] Export functionality (should this fetch ALL matching or just current page?)

- [ ] **Update PolicyListInfinite.tsx** (if still needed)
  - [ ] Verify it still uses cursor-based pagination
  - [ ] Consider deprecating if offset pagination is sufficient

### Phase 7: Performance Optimizations
- [ ] **Implement smart prefetching**
  - [ ] Prefetch next page when user reaches 80% of table scroll
  - [ ] Prefetch on pagination button hover
  - [ ] Cache last 3 pages in TanStack Query

- [ ] **Add request debouncing**
  - [ ] Debounce filter inputs (300ms)
  - [ ] Debounce search input (500ms)
  - [ ] Debounce date range selection (500ms after selecting end date)
  - [ ] Immediate query on sort/page change

- [ ] **Virtual scrolling** (optional, if page size > 100)
  - [ ] Consider `@tanstack/react-virtual` for large page sizes
  - [ ] Render only visible rows + buffer

### Phase 8: Testing & Validation
- [ ] **Unit tests**
  - [ ] Test `PolicyRepository.findAllPaginated()` with various filters
  - [ ] Test `usePoliciesPaginated` hook with mock data
  - [ ] Test pagination controls (next, prev, page numbers)

- [ ] **Integration tests**
  - [ ] Test full user flow: filter → sort → paginate
  - [ ] Test edge cases: empty results, single page, last page
  - [ ] Test concurrent updates (user edits policy while viewing page)

- [ ] **Performance tests**
  - [ ] Seed 10,000 test policies in local Supabase
  - [ ] Measure time to first paint (TTFP) for table
  - [ ] Measure filter/sort response time
  - [ ] Verify no N+1 queries (use Supabase logs)

- [ ] **Manual QA**
  - [ ] Test on real production data (if > 100 policies exist)
  - [ ] Test mobile responsiveness with pagination controls
  - [ ] Test accessibility (keyboard navigation, screen readers)

### Phase 9: Migration & Rollout
- [ ] **Feature flag** (optional)
  - [ ] Add env var `ENABLE_SERVER_PAGINATION=true`
  - [ ] Allow gradual rollout or easy rollback

- [ ] **Update documentation**
  - [ ] Document new pagination architecture in `/docs`
  - [ ] Update API documentation for service methods
  - [ ] Add performance benchmarks to docs

- [ ] **Cleanup**
  - [ ] Remove or deprecate `usePoliciesView` if no longer needed
  - [ ] Remove client-side pagination utilities if unused elsewhere
  - [ ] Update other tables (commissions, expenses) to follow same pattern

### Phase 10: Monitoring & Optimization
- [ ] **Add analytics**
  - [ ] Track average page load time
  - [ ] Track most common filter combinations
  - [ ] Track page size preferences (optimize default)

- [ ] **Query optimization**
  - [ ] Monitor slow query log in Supabase
  - [ ] Add composite indexes if needed (e.g., status + created_at)
  - [ ] Consider materialized views for complex aggregations

---

## Date Handling Architecture (CRITICAL)

### Existing Date Utilities (USE THESE!)

The app already has comprehensive date utilities to prevent timezone bugs:

**Location:** `src/lib/date.ts` and `src/utils/dateRange.ts`

**Key Functions (ALWAYS USE THESE):**

1. **`parseLocalDate(dateString: string): Date`**
   - Converts "YYYY-MM-DD" string to Date in LOCAL timezone
   - **USE THIS** instead of `new Date("YYYY-MM-DD")`
   - Example: `parseLocalDate("2024-10-01")` = Oct 1 00:00 local (NOT UTC)

2. **`formatDateForDB(date: Date | string): string`**
   - Converts Date to "YYYY-MM-DD" string
   - **USE THIS** when sending dates to Supabase
   - Example: `formatDateForDB(new Date(2024, 9, 1))` = "2024-10-01"

3. **`formatDateForDisplay(date: Date | string): string`**
   - Format for UI display: "Oct 1, 2024"
   - Automatically handles timezone correctly

4. **`getTodayString(): string`**
   - Returns today in "YYYY-MM-DD" format (local timezone)

5. **`isSameDay(date1, date2): boolean`**
   - Compare if two dates are same day (ignores time)

6. **`addDays/addMonths/addYears(dateString, n): string`**
   - Date arithmetic returning "YYYY-MM-DD" strings

**DateRange Utilities (`src/utils/dateRange.ts`):**

- `getDateRange(period: TimePeriod): { startDate: Date, endDate: Date }`
- `isInDateRange(date, range): boolean`
- `formatDateRange(range): string` - "Oct 1 - Oct 15, 2024"

### Why These Utilities Exist

**The Problem:**
```typescript
// ❌ WRONG: Creates Oct 1 00:00 UTC, becomes Sept 30 19:00 in US Eastern!
const buggyDate = new Date("2024-10-01");

// ❌ WRONG: Will send wrong date to database
const effectiveDate = new Date(userInput).toISOString(); // Adds timezone offset!

// ❌ WRONG: Display shows wrong date
<input type="date" value={policy.effectiveDate} /> // Off by one day!
```

**The Solution:**
```typescript
// ✅ CORRECT: Oct 1 00:00 local timezone
const correctDate = parseLocalDate("2024-10-01");

// ✅ CORRECT: Always "YYYY-MM-DD" format, no timezone shift
const dbDate = formatDateForDB(selectedDate);

// ✅ CORRECT: Display formatted correctly
const displayDate = formatDateForDisplay(policy.effectiveDate);
```

### Date Range Picker Requirements (recap)

**MUST-HAVE visual features:**
1. **Today highlighting** - distinct background/border for current date
2. **Range start** - primary background, left-rounded
3. **Range middle** - accent background, no rounding
4. **Range end** - primary background, right-rounded
5. **Hover preview** - semi-transparent background showing potential range
6. **Keyboard nav** - arrow keys, enter/space, escape
7. **Mobile responsive** - 1 month mobile, 2 months desktop

**Integration checklist:**
- [ ] Import date utils: `import { parseLocalDate, formatDateForDB, formatDateForDisplay } from '@/lib/date'`
- [ ] Convert DB strings to Dates: `parseLocalDate(dateString)`
- [ ] Convert Dates to DB format: `formatDateForDB(date)`
- [ ] Display dates: `formatDateForDisplay(date)`
- [ ] Never use: `new Date("YYYY-MM-DD")` or `.toISOString()`

---

## Technical Decisions

### Pagination Strategy: Offset vs Cursor
**Decision: Use OFFSET-based pagination**

**Rationale:**
- ✅ Simpler mental model for users (page numbers)
- ✅ Easier to implement "jump to page N"
- ✅ Works well with dynamic filters (cursor breaks on filter change)
- ✅ Sufficient performance for < 100k rows with proper indexes
- ❌ Cursor-based is better for infinite scroll (keep for `useInfinitePolicies`)

**Implementation:**
```typescript
// Offset calculation
const offset = (page - 1) * pageSize;
query = query.range(offset, offset + pageSize - 1);
```

### Filter Application: Client vs Server
**Decision: Server-side filtering ONLY**

**Rationale:**
- ✅ Reduces data transfer (only matching rows)
- ✅ Accurate page counts (total filtered results)
- ✅ Better performance for large datasets
- ✅ Consistent with sorting and pagination

**Anti-pattern to AVOID:**
```typescript
// ❌ DON'T DO THIS (current implementation)
const allData = await fetchAll();
const filtered = allData.filter(clientSideFilter);
```

### Count Query Optimization
**Decision: Separate count query with same filters**

**Rationale:**
- ✅ Postgres COUNT(*) is fast with WHERE clause
- ✅ Allows TanStack Query to cache count independently
- ✅ Can prefetch count while loading data
- ❌ Two queries, but parallel execution is fast

**Implementation:**
```typescript
// Parallel queries using useQueries
const [dataQuery, countQuery] = useQueries([
  { queryKey: ['policies', 'data', page, filters], queryFn: getData },
  { queryKey: ['policies', 'count', filters], queryFn: getCount }
]);
```

### Page Size Options
**Decision: 10, 25, 50, 100 (default: 25)**

**Rationale:**
- ✅ 10: Fast loading, mobile-friendly
- ✅ 25: Good balance (new default)
- ✅ 50: Power users, wider screens
- ✅ 100: Maximum for performance (avoid virtual scrolling)
- ❌ No 500/1000 options (defeats purpose of pagination)

---

## Performance Targets

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| **Time to First Paint** | < 300ms | ~500ms | Initial page load |
| **Page Change Latency** | < 150ms | N/A | With cached next page |
| **Filter Apply Latency** | < 500ms | ~2000ms | Debounced server query |
| **Sort Change Latency** | < 200ms | ~100ms | Server query, no debounce |
| **Max Dataset Size** | 100,000 policies | 1,000 limit | Supabase hard limit |
| **Memory Usage** | < 50MB for table | ~200MB | Current loads all data |

---

## Rollback Plan

If issues arise:
1. Revert `PolicyList.tsx` to use old `usePoliciesView` hook
2. Set `ENABLE_SERVER_PAGINATION=false` (if feature flag exists)
3. Keep new infrastructure (indexes, methods) for future attempt
4. Document failure reasons in `/docs/postmortems/`

---

## Success Criteria

- [ ] PolicyList.tsx loads first page in < 300ms
- [ ] Pagination works smoothly with 10,000+ policies
- [ ] Filters apply server-side with correct counts
- [ ] All existing features preserved (row selection, actions, export)
- [ ] No Supabase 1000 row limit errors
- [ ] TanStack Query cache invalidation works correctly
- [ ] Tests pass with 100% coverage on new pagination logic
- [ ] Production deployment has no regressions

---

## Related Files

**Files to Modify (REFACTOR existing, don't create new):**
- `src/services/policies/PolicyRepository.ts` - refactor findAll(), add countFiltered()
- `src/services/policies/policyService.ts` - add getPaginated(), getCount()
- `src/hooks/policies/usePoliciesView.ts` - refactor to use server-side pagination
- `src/features/policies/hooks/usePolicySummary.ts` - fix commission calculations
- `src/features/policies/components/PolicyDashboardHeader.tsx` - update to 6 metrics (2×3 grid)
- `src/features/policies/PolicyList.tsx` - integrate date range filter
- `src/types/policy.types.ts` - add effectiveDateFrom, effectiveDateTo to PolicyFilters

**Files to Create (NEW - don't exist yet):**
- `src/components/ui/date-range-picker.tsx` - new component wrapping existing Calendar
- `supabase/migrations/YYYYMMDD_NNN_add_policy_indexes.sql` - new migration

**Files to Keep As-Is:**
- `src/hooks/policies/useInfinitePolicies.ts` - keep for infinite scroll (different use case)
- `src/features/policies/PolicyListInfinite.tsx` - keep or deprecate later
- `src/hooks/base/usePagination.ts` - may deprecate if unused elsewhere

**Files to Test:**
- `src/hooks/policies/__tests__/usePoliciesView.test.tsx` - update for server-side pagination
- `src/services/policies/__tests__/PolicyRepository.test.ts` - add pagination tests

---

## Notes & Considerations

### KPI Impact
- Some KPIs (persistency, totals) may need ALL policies
- Solution: Keep `getAll()` method for reports/analytics ONLY
- Dashboard cards should use aggregation queries, not client-side sums
- Consider adding dedicated analytics endpoints for KPIs

### Export Functionality
- Should "Export to CSV" export ALL matching policies or just current page?
- **Recommendation:** Add two options:
  1. "Export Current Page" (fast, uses paginated data)
  2. "Export All Matching" (slower, fetches all with filters)

### Bulk Actions
- If user selects "all" checkbox, what does it mean?
  1. All on current page? (simple, expected)
  2. All matching filters? (powerful, but confusing UX)
- **Recommendation:** Current page only, with "Select all X matching" option

### Mobile Considerations
- Pagination controls can be cramped on mobile
- Consider simplified mobile pagination: prev/next only, no page numbers
- Keep page size selector but collapse to dropdown

---

## Questions to Resolve

1. **Export behavior:** Current page vs all matching filters?
2. **Bulk actions:** Current page vs all matching filters?
3. **Default page size:** Keep 10 or increase to 25?
4. **Feature flag:** Gradual rollout or direct deployment?
5. **Infinite scroll:** Keep `PolicyListInfinite.tsx` or consolidate?

---

## Implementation Order (Recommended)

**Week 1: Fix Existing Issues + Foundation**
- Phase 1: Analysis & Preparation
- Phase 2: Database & Service Layer (indexes, repository methods)
- **Phase 4: Fix Metrics Summary Bar** (quick win, fixes current bugs)
- Phase 5: Date Range Filtering Component (critical, do early to catch bugs)

**Week 2: Hooks & Integration**
- Phase 3: Hooks Layer (TanStack Query)
- Phase 6: UI Components (PolicyList.tsx updates)
- Integrate date range picker into filters
- Connect metrics to filtered data

**Week 3: Optimization & Testing**
- Phase 7: Performance Optimizations
- Phase 8: Testing & Validation (especially date timezone tests!)

**Week 4: Deploy & Monitor**
- Phase 9: Migration & Rollout
- Phase 10: Monitoring & Optimization

**Why Fix Metrics First (Week 1)?**
- Current commission calculation is completely wrong
- Quick fix, low risk, immediate value
- Users see correct data while pagination work continues
- Sets up foundation for filtered metrics

**Why Date Range Component in Week 1?**
- Date pickers are complex and bug-prone
- Gives more time to test timezone edge cases
- Easier to integrate early than retrofit later
- Can be tested independently before full pagination rollout

---

## CRITICAL REMINDERS (Read Before Starting Implementation)

### Date Picker Anti-Patterns to AVOID:

❌ **DON'T DO THIS:**
```typescript
// ❌ Direct date parsing - TIMEZONE BUG!
const date = new Date("2024-10-01");

// ❌ Using toISOString() - TIMEZONE BUG!
const dbDate = selectedDate.toISOString();

// ❌ Forgetting hover states
<Calendar mode="range" selected={range} />

// ❌ No today highlighting
// ❌ No range_middle styling
// ❌ No mobile responsiveness check
```

✅ **DO THIS:**
```typescript
// ✅ Use parseLocalDate for DB strings
import { parseLocalDate, formatDateForDB } from '@/lib/date';
const date = parseLocalDate("2024-10-01");

// ✅ Use formatDateForDB for sending to backend
const dbDate = formatDateForDB(selectedDate);

// ✅ Implement ALL visual states
<Calendar
  mode="range"
  selected={range}
  onSelect={setRange}
  modifiers={{
    today: new Date(),
    range_start: range?.from,
    range_middle: getRangeMiddleDates(range),
    range_end: range?.to
  }}
  onDayMouseEnter={handleHoverPreview}
  numberOfMonths={isMobile ? 1 : 2}
/>
```

### Testing Checklist Before Marking Date Picker "Done":

- [ ] Selected Oct 1 in calendar → Sends "2024-10-01" to backend (check network tab)
- [ ] Database has "2024-10-01" → Displays "Oct 1, 2024" in UI (NOT Sept 30!)
- [ ] Today's date has visible highlight (background/border)
- [ ] Hover over date shows preview range (semi-transparent background)
- [ ] Range start has primary background, left-rounded corners
- [ ] Range end has primary background, right-rounded corners
- [ ] Range middle dates have accent background, no rounding
- [ ] Works on mobile (single month, touch targets)
- [ ] Works on desktop (two months, mouse hover)
- [ ] Keyboard navigation works (arrow keys, enter, escape)
- [ ] Tested in different timezone (or mocked timezone offset)
- [ ] Tested near DST boundaries (March 10, November 3 in US)

### Phase Prioritization:

**DO EARLY (Week 1):**
- Phase 4: Date Range Component - complex, needs time to test

**DO SECOND (Week 2):**
- Phase 2-3: Database indexes, service layer, hooks

**DO LAST (Week 3-4):**
- Phase 7-10: Optimization, testing, rollout

---

## FINAL PLAN SUMMARY

### What We're Building:

1. **Server-Side Pagination**
   - Fix Supabase 1000 row limit
   - Only fetch current page (25-50 policies at a time)
   - Offset-based pagination (page numbers)

2. **Date Range Filtering**
   - New DateRangePicker component
   - Filter policies by effective date range
   - Proper timezone handling using existing date utilities

3. **Fixed Metrics (6 Total)**
   - Row 1: Total, Active, Pending (counts)
   - Row 2: Annual Premium, Paid Commissions, Pending Commissions (money)
   - All metrics respect filters
   - Time period label: "Showing: {date range}" or "Showing: All Policies"

### Key Principles:

✅ **KISS** - Keep it simple, don't over-engineer
✅ **SOLID** - Single responsibility, clean architecture
✅ **No Duplication** - Refactor existing files, don't create new versions
✅ **No Assumptions** - Use existing date utilities, don't reinvent
✅ **Clean Code** - Maintainable, readable, testable

### Files Impact:

- **Refactor:** 7 existing files
- **Create:** 2 new files (date-range-picker.tsx, migration SQL)
- **Test:** Update 2 test files

### Implementation: 4 Weeks

- Week 1: Fix metrics, database indexes, date picker
- Week 2: Hooks refactor, UI integration
- Week 3: Testing, optimization
- Week 4: Deploy, monitor

**Ready to implement without over-engineering. Each phase has clear acceptance criteria.**

---

**END OF PLAN**
