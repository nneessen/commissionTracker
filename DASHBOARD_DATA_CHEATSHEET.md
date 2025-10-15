# Dashboard Calculation Data Cheat Sheet
**Generated:** October 14, 2025
**Purpose:** Real database data for accurate calculation verification

---

## 🔴 CRITICAL BUGS IDENTIFIED

### Bug #1: Commission Field Mismatch (SHOW STOPPER)
**Issue:** Code references `advanceAmount` field that DOESN'T EXIST in database
**Impact:** ALL commission calculations show $0.00
**Database Schema:**
- ✅ `amount` (total commission)
- ✅ `earned_amount` (portion earned over time)
- ✅ `unearned_amount` (portion not yet earned)
- ❌ `advanceAmount` (DOES NOT EXIST)

**Fix:** Replace all `advanceAmount` → `amount` in code

### Bug #2: Double Scaling Issue
**Issue:** Dashboard fetches MONTHLY data, then SCALES it again
**Code:**
```typescript
// Line 59: Always fetches monthly
useMetricsWithDateRange({ timePeriod: 'monthly' })

// Line 81: Then scales monthly data to display period
scaleToDisplayPeriod(periodCommissions.earned, timePeriod)
```

**Result:**
- Monthly view: Correct (monthly data × 1)
- Weekly view: WRONG (monthly data ÷ 4.33 = incorrect weekly)
- Daily view: WRONG (monthly data ÷ 30.44 = incorrect daily)

**Fix:** Either fetch data for selected period OR fetch all data and scale once

### Bug #3: Unclear Time Period Definitions
**Issue:** "Monthly" could mean:
- Month-to-Date (Oct 1 - Oct 14)? ✅ Currently this
- Last 30 days (Sep 14 - Oct 14)?
- Average monthly rate?

**User Need:** Clear labels showing exact date ranges

---

## 📊 REAL DATABASE DATA (as of Oct 14, 2025)

### POLICIES TABLE
```
Total Policies: 2
Active Policies: 2
Lapsed: 0
Cancelled: 0
```

| Policy # | Effective Date | Annual Premium | Monthly Premium | Status | Commission % |
|----------|---------------|----------------|-----------------|---------|--------------|
| 1        | 2025-10-14    | $600.00        | $50.00          | active  | 100%         |
| 2        | 2025-10-14    | $3,900.00      | $325.00         | active  | 100%         |

**Totals:**
- Annual Premium: $4,500.00
- Monthly Premium: $375.00
- Average Premium: $2,250.00

---

### COMMISSIONS TABLE
```
Total Commissions: 2
Paid: 1
Pending: 1
```

| Policy # | Amount    | Rate   | Type    | Status  | Advance Months | Months Paid | Earned | Unearned  | Payment Date |
|----------|-----------|--------|---------|---------|----------------|-------------|--------|-----------|--------------|
| 1        | $450.00   | 100%   | advance | paid    | 9              | 0           | $0.00  | $450.00   | 2025-10-14   |
| 2        | $2,925.00 | 100%   | advance | pending | 9              | 0           | $0.00  | $2,925.00 | -            |

**Totals:**
- Total Commission Amount: $3,375.00
- Paid Commission: $450.00 (status='paid')
- Pending Commission: $2,925.00 (status='pending')
- Total Earned (over time): $0.00 (0 months paid on both)
- Total Unearned: $3,375.00

**Commission Calculation Logic:**
```sql
earned_amount = (amount / advance_months) × months_paid
unearned_amount = amount - earned_amount

Policy 1: ($450 / 9) × 0 = $0 earned, $450 unearned
Policy 2: ($2,925 / 9) × 0 = $0 earned, $2,925 unearned
```

---

### EXPENSES TABLE (October 2025)
```
Total Expenses (Oct 1-14): $5,450.00
Count: 2 expenses
All Recurring: Yes
```

| Date       | Category     | Amount    | Recurring | Tax Deductible |
|------------|-------------|-----------|-----------|----------------|
| 2025-10-01 | Rent & Lease| $4,200.00 | Yes       | No             |
| 2025-10-14 | Insurance   | $1,250.00 | Yes       | No             |

**Note:** More expenses exist outside Oct 1-14 date range

---

## ✅ CORRECT CALCULATIONS (October 1-14, 2025)

### Month-to-Date (MTD) - Oct 1 to Oct 14
```
New Policies: 2
Premium Written: $4,500.00
Commission Paid: $450.00
Commission Pending: $2,925.00
Total Expenses: $5,450.00

Net Income: $450 - $5,450 = -$5,000 (DEFICIT)
Pending Pipeline: $2,925.00
Breakeven Needed: $5,000.00
```

### What Dashboard SHOULD Show (Monthly View)
```
✅ Monthly Commission Earned: $450.00
✅ Pending Pipeline: $2,925.00
✅ Monthly Total Expenses: $5,450.00
✅ Monthly Net Income: -$5,000.00 (deficit)
✅ Breakeven Needed: $5,000.00
✅ Active Policies: 2
✅ Total Policies: 2
✅ New Policies (MTD): 2
✅ Premium Written (MTD): $4,500.00
✅ Avg Premium: $2,250.00
```

### What Dashboard LIKELY Shows (Due to Bugs)
```
❌ Monthly Commission Earned: $0.00 (advanceAmount field doesn't exist)
❌ Pending Pipeline: $0.00 or wrong value
❌ All commission-based calculations: WRONG
```

---

## 🎯 TIME PERIOD INTERPRETATION

### Current Implementation
**"Monthly"** = Month-to-Date (MTD)
- Start: October 1, 2025 00:00:00
- End: October 14, 2025 (current time)
- Days in Range: 14 days

**Problem:** When user switches to "Weekly", it:
1. Still fetches monthly data (Oct 1-14)
2. Then scales it: `monthly_value ÷ 30.44 × 7`
3. Shows incorrect weekly value

### Proposed Clarification
Add explicit labels:
- **Daily** = Today only (Oct 14)
- **Weekly** = Last 7 days (Oct 7-14)
- **Monthly** = Month-to-Date (Oct 1-14)
- **Yearly** = Year-to-Date (Jan 1 - Oct 14)

OR provide date range selector with these presets

---

## 🔧 DATABASE SCHEMA REFERENCE

### commissions table columns:
```
id                 uuid
user_id            uuid
policy_id          uuid
amount             numeric(10,2)    ← USE THIS (total commission)
rate               numeric(5,2)     ← commission rate %
type               text             ← 'advance' or other
status             text             ← 'paid', 'pending'
payment_date       date
advance_months     integer          ← default 9
months_paid        integer          ← default 0
earned_amount      numeric(10,2)    ← calculated based on months_paid
unearned_amount    numeric(10,2)    ← calculated
```

**NO `advanceAmount` field exists!**

### policies table columns:
```
annual_premium         numeric(10,2)
monthly_premium        numeric(10,2)
commission_percentage  numeric(5,2)  ← stored as decimal (1.00 = 100%)
effective_date         date
status                 text          ← 'active', 'lapsed', 'cancelled'
```

---

## 📋 VERIFICATION CHECKLIST

When fixing calculations, verify each:

- [ ] Commission Earned uses `amount` not `advanceAmount`
- [ ] Pending Pipeline uses `amount` not `advanceAmount`
- [ ] Time period filtering matches displayed label
- [ ] No double scaling (filter OR scale, not both)
- [ ] Date ranges clearly displayed to user
- [ ] MTD calculations use Oct 1 - Oct 14 range
- [ ] Weekly calculations use last 7 days
- [ ] Daily calculations use today only
- [ ] All calculations match this cheat sheet

---

## 🧪 TEST CASES

### Test Case 1: Monthly View (Current)
**Expected:**
- Commission Earned: $450
- Net Income: -$5,000
- New Policies: 2

### Test Case 2: Switch to Daily
**Expected (Oct 14 only):**
- Commission Earned: $450 (payment_date = 2025-10-14)
- Expenses: $1,250 (insurance on Oct 14)
- Net Income: -$800

### Test Case 3: Switch to Weekly (Last 7 days)
**Expected (Oct 7-14):**
- Commission Earned: $450
- Expenses: $5,450 (if Oct 7-14 contains both expenses)
- Net Income: -$5,000

---

## 💡 RECOMMENDED FIX PRIORITY

1. **FIX COMMISSION FIELD** (highest priority - causes $0 everywhere)
2. **FIX TIME PERIOD LOGIC** (remove double scaling)
3. **ADD DATE RANGE DISPLAY** (show "Oct 1 - Oct 14" on dashboard)
4. **ADD CALCULATION VERIFICATION** (log calculated vs expected)
5. **TEST WITH REAL DATA** (use this cheat sheet)
