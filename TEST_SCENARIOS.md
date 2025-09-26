# Test Scenarios - What Should Update When Constants Change

## Initial State
- Avg AP: $2000
- Commission Rate: 0.75 (75%)
- Target 1: $5000
- Target 2: $10000
- Monthly Expenses: ~$15,000 (from all expense categories)

## Scenario 1: Change Avg AP from $2000 to $1500

### What SHOULD change:
1. **Policy Counts** - Should INCREASE (need more policies when each has less AP)
   - All policy counts at all persistency levels should increase
2. **Commission per Policy** - Should DECREASE from $1500 to $1125
   - Formula: avgAP * commissionRate = 1500 * 0.75 = $1125

### What should NOT change:
- AP amounts (they're based on commission needed / commission rate, not avgAP)
- Commission needed amounts
- Weekly/Daily/Quarterly AP targets (based on AP needed, not avgAP)
- Expense ratio (based on commission needed, not avgAP)

## Scenario 2: Change Commission Rate from 0.75 to 0.50

### What SHOULD change:
1. **AP Amounts** - Should INCREASE significantly
   - Formula: commission needed / commission rate
   - Lower rate means need MORE AP to generate same commission
2. **Policy Counts** - Should INCREASE
   - More AP needed + same avgAP = more policies
3. **Commission per Policy** - Should DECREASE
   - Formula: avgAP * commissionRate = 2000 * 0.50 = $1000
4. **Expense Ratio** - Should INCREASE
   - Lower commission rate means expenses are higher % of commission
5. **Weekly/Daily/Quarterly AP Targets** - Should INCREASE
   - Based on breakeven AP needed, which increases

## Scenario 3: Change Target 1 from $5000 to $7500

### What SHOULD change:
1. **Second Card Label** - Should show "+$7,500" instead of "+$5,000"
2. **Second Card Values** - All values should increase:
   - Commission Needed increases
   - AP amounts increase
   - Policy counts increase

### What should NOT change:
- First card (Breakeven) - not affected by target1
- Third card (uses target2) - not affected by target1
- Performance metrics (based on breakeven only)

## Scenario 4: Change Target 2 from $10000 to $15000

### What SHOULD change:
1. **Third Card Label** - Should show "+$15,000" instead of "+$10,000"
2. **Third Card Values** - All values should increase

### What should NOT change:
- First and second cards
- Performance metrics

## Console Logs to Verify

When any constant changes, you should see:
1. 🔥 [ConstantsManager] Constants updated: {new values}
2. 🔄 RECALCULATING with constants: {showing all inputs}
3. 📊 Breakeven/+$X/+$Y: {showing calculated values}
4. 🎯 RECALCULATING Performance Metrics
5. ✅ [CalculationsDisplay] RENDERING with new values

ALL these logs should fire when ANY input changes!