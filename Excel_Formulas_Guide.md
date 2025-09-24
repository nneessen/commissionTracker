# Excel Formulas Guide for Commission Calculator

## Cell References

- **B3**: Total Business Expenses
- **B4**: Average Annual Premium
- **B5**: Advance Percentage
- **B8**: Commission Per Policy (calculated)

## Key Formulas

### Commission Per Policy (Cell B8)

```excel
=B4*(B5/100)
```

**Explanation**: Multiplies Annual Premium by Advance Percentage (converted from percentage to decimal)

### Policies Needed at 100% Persistency (Cell B11)

```excel
=B3/B8
```

**Explanation**: Divides total expenses by commission per policy to find baseline policies needed

### Policies Needed at Different Persistency Rates

```excel
=B11/0.9    (90% persistency)
=B11/0.8    (80% persistency)
=B11/0.7    (70% persistency)
=B11/0.6    (60% persistency)
=B11/0.5    (50% persistency)
```

**Explanation**: Divides baseline policies by persistency rate to account for policy lapses

### Total Commission Verification (Column C)

```excel
=B12*$B$8   (for each persistency level)
```

**Explanation**: Multiplies policies needed by commission per policy to verify total commission equals expenses

## How to Use

1. Open the CSV file in Excel
2. Modify the yellow input cells (B3, B4, B5) with your numbers
3. All calculations update automatically
4. The table shows exactly how many policies you need at each persistency rate

## Example Calculation

- Expenses: $15,000
- Annual Premium: $2,000
- Advance: 75%
- Commission per policy: $1,500
- At 90% persistency: Need 11.1 policies (rounded up to 12)

