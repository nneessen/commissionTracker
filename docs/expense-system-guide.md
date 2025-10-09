# Commission Tracker - Expense System & Metrics Guide

## Table of Contents
- [How the Expense System Works](#how-the-expense-system-works)
- [Understanding Dashboard Metrics](#understanding-dashboard-metrics)
- [Time Period Filtering](#time-period-filtering)
- [FAQ](#frequently-asked-questions)

---

## How the Expense System Works

### Adding Expenses

When you add an expense in the system, you're creating a **single expense record** for a specific date. Each expense entry represents an actual payment or cost incurred on that date.

**IMPORTANT:** Every expense must be added individually. The system does NOT automatically generate future expenses.

### The "Recurring" Checkbox

**What it does:**
- Sets a flag (`is_recurring`) on the expense record
- Helps you categorize expenses for reporting
- **Does NOT automatically create future expense entries**

**What it means:**
- When checked: This expense happens regularly (rent, insurance, subscriptions)
- When unchecked: This is a one-time expense (equipment purchase, one-off service)

**How to use it:**
- Check "Recurring" for expenses you pay regularly
- You still need to add the expense each month/week when you actually pay it
- The flag helps you:
  - Filter expenses in reports (show only recurring vs one-time)
  - Calculate your baseline monthly costs
  - Identify which expenses are fixed vs variable

**Example:**
- You pay $500 rent every month
- Add expense for January rent: Amount=$500, Category=Rent, Recurring=✓
- In February, you must add another expense entry for February rent
- The system will NOT automatically create the February expense

### The "Tax Deductible" Checkbox

**What it does:**
- Sets a flag (`is_deductible`) on the expense record
- Marks expenses that can be written off on your taxes

**What it means:**
- When checked: This expense can reduce your taxable income
- When unchecked: Personal or non-deductible business expense

**How to use it:**
- Check for legitimate business expenses (office supplies, business travel, professional services)
- Leave unchecked for personal expenses or non-deductible items
- Use this for:
  - Year-end tax reporting
  - Calculating actual deductible business expenses
  - Separating business from personal expenses

**Common Tax-Deductible Expenses:**
- Office supplies and equipment
- Business insurance premiums
- Professional development/training
- Marketing and advertising
- Business travel and meals (check local tax rules)
- Professional services (accounting, legal)

---

## Understanding Dashboard Metrics

### Period-Based Metrics (Change with Time Filter)

These metrics show **actual data** for the selected time period (daily/weekly/monthly/yearly):

#### 1. **Commission Earned**
- **What:** Total commission payments received in the selected period
- **Calculation:** Sum of all commissions with status='paid' and paidDate within period
- **Example:** If you select "Monthly" and earned $5,000 in commissions this month, it shows $5,000

#### 2. **Expenses**
- **What:** Total expenses recorded in the selected period
- **Calculation:** Sum of all expense amounts with date within period
- **Example:** If you spent $2,000 on business expenses this week, "Weekly" view shows $2,000

#### 3. **Surplus/Deficit**
- **What:** Your profit or loss for the period
- **Calculation:** Commission Earned - Expenses
- **Green (Surplus):** You're profitable (earning more than spending)
- **Red (Deficit):** You're at a loss (spending more than earning)

#### 4. **New Policies**
- **What:** Number of new insurance policies written in the period
- **Calculation:** Count of policies with effectiveDate within period

#### 5. **New Clients**
- **What:** Number of new unique clients acquired in the period
- **Calculation:** Count of unique clients from new policies in period

#### 6. **Premium Written**
- **What:** Total annual premium value of new policies in period
- **Calculation:** Sum of annualPremium for all new policies in period

### Point-in-Time Metrics (Stay Constant)

These metrics show the **current state** regardless of time period selected:

#### 1. **Active Policies**
- **What:** Total number of currently active insurance policies
- **Why constant:** Shows your current book of business

#### 2. **Pending Pipeline**
- **What:** Total value of commissions awaiting payment
- **Why constant:** Shows what you're currently owed

#### 3. **Total Clients**
- **What:** Lifetime total of unique clients
- **Why constant:** Shows your total client base

#### 4. **Retention Rate**
- **What:** Percentage of policies that remain active
- **Calculation:** (Active Policies / Total Policies) × 100

### Calculated Analytics

#### 1. **Breakeven Needed**
- **What:** Additional commission needed to cover expenses
- **Calculation:** If in deficit: Expenses - Commission Earned, else 0
- **Use:** Know how much more you need to earn to be profitable

#### 2. **Policies Needed**
- **What:** Number of policies to sell to break even
- **Calculation:** Breakeven Needed / Average Commission per Policy
- **Use:** Concrete sales target to reach profitability

#### 3. **Pace Metrics** (Daily/Weekly/Monthly Targets)
- **What:** How many policies you need to sell per time unit to hit goals
- **Calculation:** Policies Needed / Time Remaining in Period
- **Use:** Daily actionable targets

---

## Time Period Filtering

### How It Works

When you select a time period, the system filters data to show **only actual data from that period**:

### Daily
- **Shows:** Today's data only (midnight to current time)
- **Use Case:** Track your daily performance
- **Example:** If it's 3 PM and you've earned $500 today, it shows $500 (not a daily average)

### Weekly
- **Shows:** Last 7 days of actual data
- **Use Case:** See your recent week's performance
- **Example:** If you earned $3,500 over the last 7 days, it shows $3,500 total

### Monthly
- **Shows:** Current month from the 1st to today
- **Use Case:** Track month-to-date progress
- **Example:** If it's Oct 15 and you've earned $10,000 this month, it shows $10,000

### Yearly
- **Shows:** Year-to-date from January 1 to today
- **Use Case:** Annual performance tracking
- **Example:** Total actual earnings and expenses from Jan 1 to today

**IMPORTANT:** All metrics show **actual totals** for the period, NOT:
- Daily averages
- Projected amounts
- Annualized figures
- Pro-rated values

---

## Frequently Asked Questions

### Q: Do I need to add recurring expenses every month?
**A:** Yes. The system does not auto-generate expenses. The "recurring" flag is just for categorization and reporting. You must manually add each expense when it occurs.

### Q: What happens if I forget to add a recurring expense?
**A:** Nothing automatic happens. Your reports will not include that expense until you manually add it. You can add past expenses by setting the appropriate date.

### Q: Can I bulk-add recurring expenses for the year?
**A:** Currently, no. Each expense must be added individually. This ensures accuracy since amounts may vary (utilities) or you might cancel services.

### Q: How do I know which expenses are tax-deductible?
**A:** Consult your tax advisor. Generally, legitimate business expenses are deductible. Personal expenses or entertainment are typically not. The checkbox helps you track this for tax time.

### Q: Why don't metrics change when I switch time periods?
**A:** They DO change! Look at the actual numbers:
- Commission Earned, Expenses, Surplus/Deficit will show different totals
- Point-in-time metrics (Active Policies, Total Clients) stay the same because they show current state

### Q: How accurate are the calculations?
**A:** 100% accurate. The system shows exact sums of actual data in your database for the selected period. No estimates or projections.

### Q: Can I see expenses by category?
**A:** Yes, the metrics track expenses by category. The full breakdown is available in the Expenses section of the app.

### Q: What's the difference between "Pending" and "Paid" commissions?
**A:**
- **Pending:** Commission earned but not yet received (counts toward Pending Pipeline)
- **Paid:** Commission actually received (counts toward Period Commission)

### Q: How often should I update my data?
**A:**
- Add expenses as they occur (or daily/weekly batch)
- Update commission status when payments are received
- Add new policies as soon as they're written
- Update policy status if they lapse or cancel

---

## Best Practices

1. **Add expenses promptly** - Don't let them pile up
2. **Be consistent with categories** - Use the same category names
3. **Mark tax-deductible accurately** - Helps at tax time
4. **Update commission status** - Move from pending to paid when received
5. **Review metrics regularly** - Daily or weekly to stay on track
6. **Use time periods appropriately**:
   - Daily: For immediate performance check
   - Weekly: For short-term trend analysis
   - Monthly: For business planning
   - Yearly: For tax and annual planning

---

## Need Help?

- **Metrics not updating?** Refresh the page - data comes from database
- **Numbers look wrong?** Check the time period selected
- **Missing expenses?** Remember to add them manually
- **Commission not showing?** Check if status is set correctly (paid vs pending)

---

*Last Updated: October 2025*