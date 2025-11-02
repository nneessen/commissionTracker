# Date Handling Rules - CRITICAL

**Created:** November 2, 2025
**Status:** MANDATORY - All developers MUST follow these rules

## The Problem We Fixed

JavaScript's `Date` object and timezone handling causes dates to shift by one day when:
1. A date string like "2025-11-02" is converted to a Date object
2. The system is in a negative UTC timezone (like all US timezones)
3. The date is then displayed or manipulated

**Example of the bug:**
```javascript
// WRONG - Causes date to shift
new Date("2025-11-02") // Creates Nov 2 at 00:00 UTC
// In US Eastern Time (UTC-5), this becomes Nov 1 at 19:00 local time!

// WRONG - toISOString shifts dates
const date = new Date(2025, 10, 2); // Nov 2 in local time
date.toISOString().split("T")[0] // May return "2025-11-01" if in US timezone!
```

## The Solution - Mandatory Rules

### RULE 1: Always Use Our Date Utilities

**Location:** `/src/lib/date.ts`

**Required Functions:**
- `parseLocalDate(dateString)` - Parse YYYY-MM-DD string to Date in LOCAL timezone
- `formatDateForDB(date)` - Format Date to YYYY-MM-DD string in LOCAL timezone
- `normalizeDatabaseDate(date)` - Normalize any date from Supabase to YYYY-MM-DD string
- `formatDateForDisplay(date)` - Format date for user display

### RULE 2: Never Use These JavaScript Methods

❌ **FORBIDDEN:**
```javascript
// NEVER do this:
new Date(dateString)                    // Creates UTC date - WRONG!
date.toISOString().split("T")[0]       // Shifts timezone - WRONG!
date.toLocaleDateString()               // Inconsistent format - WRONG!
```

✅ **CORRECT:**
```javascript
// ALWAYS do this:
parseLocalDate(dateString)              // Parse in local timezone
formatDateForDB(date)                   // Format for database
normalizeDatabaseDate(dbValue)         // Normalize from database
formatDateForDisplay(date)             // Display to user
```

### RULE 3: Database Dates

**When saving to database:**
```javascript
import { formatDateForDB } from '@/lib/date';

const formData = {
  effectiveDate: formatDateForDB(new Date()), // Always use this
  // NOT: new Date().toISOString().split("T")[0]
};
```

**When displaying from database:**
```javascript
import { formatDate } from '@/lib/format';
import { normalizeDatabaseDate } from '@/lib/date';

// In your component
<td>{formatDate(normalizeDatabaseDate(policy.effectiveDate))}</td>
// NOT: {formatDate(policy.effectiveDate)}
```

### RULE 4: Form Inputs

**For date inputs:**
```javascript
<input
  type="date"
  value={formatDateForDB(dateValue)}  // Always format for input
  onChange={(e) => setDate(parseLocalDate(e.target.value))}
/>
```

## Testing Checklist

Before committing any date-related code:

1. ✅ Create a record with today's date
2. ✅ Verify it shows today's date (not yesterday)
3. ✅ Edit the record - verify date doesn't change
4. ✅ Test at different times of day
5. ✅ Test with different dates (1st, 15th, 31st of month)

## Import Locations

```javascript
// Date parsing and formatting for DB
import {
  parseLocalDate,
  formatDateForDB,
  normalizeDatabaseDate
} from '@/lib/date';

// Display formatting
import { formatDate } from '@/lib/format';
```

## Common Patterns

### Pattern 1: Display Database Date
```javascript
// Component receiving date from Supabase
const displayDate = formatDate(normalizeDatabaseDate(record.date));
```

### Pattern 2: Save Form Date
```javascript
// Form submission
const payload = {
  date: formatDateForDB(formDate)
};
```

### Pattern 3: Default Today's Date
```javascript
// Form default value
const [date, setDate] = useState(formatDateForDB(new Date()));
```

### Pattern 4: Parse User Input
```javascript
// Date picker change handler
const handleDateChange = (e) => {
  const parsed = parseLocalDate(e.target.value);
  setDate(parsed);
};
```

## Files Already Fixed

As of November 2, 2025, these files have been corrected:
- ✅ `/src/lib/date.ts` - Added `normalizeDatabaseDate()` function
- ✅ `/src/features/policies/PolicyList.tsx` - Fixed date display
- ✅ `/src/features/policies/PolicyForm.tsx` - Removed all toISOString()
- ✅ `/src/features/policies/PolicyListInfinite.tsx` - Fixed date display

## Files That May Need Review

Check these files for date handling issues:
- `/src/services/analytics/*.ts` - Uses `new Date()` on database dates
- `/src/services/policies/policyService.ts` - Date conversions
- `/src/hooks/useMetrics.ts` - Date calculations
- `/src/hooks/useAnalyticsData.ts` - Date filtering
- `/src/utils/formatters.ts` - Has duplicate (wrong) formatDate function

## Red Flags in Code Review

If you see any of these, the code needs fixing:
- 🚨 `new Date(databaseValue)`
- 🚨 `.toISOString().split("T")[0]`
- 🚨 Direct date string manipulation
- 🚨 Importing formatDate from `/utils/formatters.ts`
- 🚨 Missing date normalization when displaying

## Developer Onboarding

New developers MUST:
1. Read this document completely
2. Review `/src/lib/date.ts` implementation
3. Test date handling in their local timezone
4. Never use native JavaScript Date parsing for database dates

## Consequences of Not Following These Rules

- Users see wrong dates (off by one day)
- Data appears to be corrupted (it's not, just displayed wrong)
- Time-sensitive features fail (policy effective dates, etc.)
- User trust is broken

## Questions?

If unsure about date handling:
1. Check `/src/lib/date.ts` for utilities
2. Follow the patterns in this document
3. Test with multiple dates and timezones
4. Ask for code review on date-related changes

---

**Remember:** Dates are one of the hardest things in programming. Always use our utilities, never trust JavaScript's Date object with strings, and test thoroughly.