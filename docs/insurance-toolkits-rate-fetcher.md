# Insurance Toolkits Rate Fetcher

## Overview
Browser console scripts to fetch insurance quotes from Insurance Toolkits API for Term Life and Final Expense (Whole Life) products.

---

# Term Life Quotes

## Prerequisites
1. Be logged into https://app.insurancetoolkits.com
2. Navigate to the term quoter: https://app.insurancetoolkits.com/term/quoter
3. Open browser DevTools (F12) → Console tab

## Basic Script (Single Configuration)

```javascript
const token = localStorage.getItem('accessToken');
const faceAmounts = [25000, 50000, 75000, 100000, 150000];
const results = [];

for (const faceAmount of faceAmounts) {
  const res = await fetch('https://api.insurancetoolkits.com/quoter/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      faceAmount,
      sex: 'Male',
      term: '20',
      state: 'IL',
      age: 35,
      tobacco: 'None',
      paymentType: 'Bank Draft/EFT',
      underwritingItems: [],
      toolkit: 'TERM'
    })
  });
  const data = await res.json();
  results.push({ faceAmount, quotes: data.quotes || [] });
  console.log(`Fetched ${faceAmount}: ${data.quotes?.length || 0} quotes`);
}

console.log('Done!');
console.table(results.flatMap(r =>
  r.quotes.map(q => ({
    face: r.faceAmount,
    company: q.company,
    plan: q.plan_name,
    monthly: q.monthly
  }))
));
```

## Full Script with CSV Export

```javascript
const fetchRatesWithExport = async () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.error('No access token found. Make sure you are logged in.');
    return;
  }

  // Configuration - modify these as needed
  const CONFIG = {
    faceAmounts: [25000, 50000, 75000, 100000, 150000, 200000, 500000, 1000000],
    sex: 'Male',           // 'Male' or 'Female'
    term: '20',            // '10', '15', '20', '25', '30'
    state: 'IL',           // Two-letter state code
    age: 30,               // Applicant age
    tobacco: 'None',       // 'None' or 'Tobacco'
  };

  const allQuotes = [];

  for (const faceAmount of CONFIG.faceAmounts) {
    try {
      const res = await fetch('https://api.insurancetoolkits.com/quoter/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          faceAmount,
          sex: CONFIG.sex,
          term: CONFIG.term,
          state: CONFIG.state,
          age: CONFIG.age,
          tobacco: CONFIG.tobacco,
          paymentType: 'Bank Draft/EFT',
          underwritingItems: [],
          toolkit: 'TERM'
        })
      });

      const data = await res.json();

      if (data.quotes) {
        for (const q of data.quotes) {
          allQuotes.push({
            face_amount: faceAmount,
            company: q.company,
            plan_name: q.plan_name,
            tier_name: q.tier_name,
            monthly: q.monthly,
            yearly: q.yearly,
            state: CONFIG.state,
            gender: CONFIG.sex,
            age: CONFIG.age,
            term_years: CONFIG.term,
            tobacco: CONFIG.tobacco
          });
        }
      }

      console.log(`Fetched $${faceAmount.toLocaleString()}: ${data.quotes?.length || 0} quotes`);
      await new Promise(r => setTimeout(r, 100));

    } catch (e) {
      console.error(`Error fetching ${faceAmount}:`, e.message);
    }
  }

  console.log(`\nTotal quotes fetched: ${allQuotes.length}`);
  window.fetchedRates = allQuotes;

  // Generate tab-separated CSV (for easy paste into import dialog)
  if (allQuotes.length > 0) {
    const headers = Object.keys(allQuotes[0]);
    const csvContent = [
      headers.join('\t'),
      ...allQuotes.map(row =>
        headers.map(h => row[h]).join('\t')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rates_${CONFIG.state}_${CONFIG.sex}_age${CONFIG.age}_${CONFIG.term}yr.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('CSV file downloaded!');
  }

  return allQuotes;
};

fetchRatesWithExport();
```

## Request Parameters Reference

| Parameter | Values | Description |
|-----------|--------|-------------|
| `faceAmount` | number | Coverage amount (e.g., 25000, 50000, 100000) |
| `sex` | `'Male'`, `'Female'` | Applicant gender |
| `term` | `'10'`, `'15'`, `'20'`, `'25'`, `'30'` | Term length in years |
| `state` | Two-letter code | State code (e.g., 'IL', 'OH', 'CA') |
| `age` | number | Applicant age |
| `tobacco` | `'None'`, `'Tobacco'` | Tobacco usage status |
| `paymentType` | `'Bank Draft/EFT'` | Payment method |
| `toolkit` | `'TERM'` | Product type |

## Response Fields

Each quote includes:
- `company` - Carrier name
- `plan_name` - Full plan name with tier
- `tier_name` - Health class tier
- `monthly` - Monthly premium
- `yearly` - Annual premium
- `face_amount` - Coverage amount
- `warning` - Any warnings about the quote
- `eapp_link` - Link to carrier's e-application

## Importing into Commission Tracker

After exporting the CSV file:

1. Go to **Settings → Underwriting → Rate Entry**
2. Click **Import CSV** button (top right)
3. Open the downloaded CSV in Excel/Sheets
4. Select all data (Ctrl+A) and copy (Ctrl+C)
5. Paste into the Import dialog
6. Click **Parse CSV**
7. Map each carrier/product to your existing database entries:
   - Select the matching carrier from your carriers list
   - Select the matching product from that carrier's products
8. Click **Import** to save

### Data Mapping

The import automatically extracts:
- **Carrier**: From company name (e.g., "Transamerica" from "Transamerica (Trendsetter Super 2021)")
- **Product**: From parentheses (e.g., "Trendsetter Super 2021")
- **Health Class**: From plan name (Preferred Plus, Preferred, Standard Plus, Standard)
- **Term Years**: From CSV column
- **Gender/Tobacco**: Mapped from CSV values

### Notes

- You must have carriers and products created in your database first
- The import will attempt to auto-match carriers/products by name similarity
- Rates are grouped by classification (gender, tobacco, health class, term) before inserting

## Troubleshooting

**401 Unauthorized**: Token expired. Refresh the page and try again.

**Token not found**: Make sure you're logged in and on the Insurance Toolkits site.

**No quotes returned**: Some age/face amount combinations may not be available from all carriers.

**Import fails**: Make sure you have the carrier and product created in your database first.

---

# Final Expense (Whole Life) Quotes

## Prerequisites
1. Be logged into https://app.insurancetoolkits.com
2. Navigate to the FEX quoter: https://app.insurancetoolkits.com/fex/quoter
3. Open browser DevTools (F12) → Console tab

## FEX Script with CSV Export (Multi-Age)

This script fetches quotes across multiple ages with proper rate limiting to avoid API throttling.

```javascript
const fetchFEXRates = async () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.error('No access token found. Make sure you are logged in.');
    return;
  }

  // Configuration - modify these as needed
  const CONFIG = {
    faceAmounts: [5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000],
    ages: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85],
    sex: 'Male',           // 'Male' or 'Female'
    state: 'IL',           // Two-letter state code
    tobacco: 'None',       // 'None' or 'Tobacco'
    coverageType: 'Level', // 'Level' or 'Graded'
  };

  const allQuotes = [];
  const total = CONFIG.faceAmounts.length * CONFIG.ages.length;
  let current = 0;

  for (const age of CONFIG.ages) {
    for (const faceAmount of CONFIG.faceAmounts) {
      current++;

      try {
        const res = await fetch('https://api.insurancetoolkits.com/quoter/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            faceAmount,
            coverageType: CONFIG.coverageType,
            sex: CONFIG.sex,
            state: CONFIG.state,
            age,
            feet: '',
            inches: '',
            weight: '',
            tobacco: CONFIG.tobacco,
            paymentType: 'Bank Draft/EFT',
            underwritingItems: [],
            toolkit: 'FEX'
          })
        });

        const data = await res.json();

        if (data.quotes) {
          for (const q of data.quotes) {
            allQuotes.push({
              face_amount: faceAmount,
              company: q.company,
              plan_name: q.plan_name,
              tier_name: q.tier_name,
              monthly: parseFloat(q.monthly.replace(/,/g, '')),
              yearly: parseFloat(q.yearly.replace(/,/g, '')),
              state: CONFIG.state,
              gender: CONFIG.sex,
              age: age,
              term_years: '',
              tobacco: CONFIG.tobacco
            });
          }
        }

        if (current % 10 === 0) {
          console.log(`Progress: ${current}/${total} (${Math.round(current/total*100)}%)`);
        }

        // Rate limiting: 500ms between requests
        await new Promise(r => setTimeout(r, 500));

      } catch (e) {
        console.error(`Error fetching age ${age}, face ${faceAmount}:`, e.message);
      }
    }

    // Extra 1s pause between age groups to avoid throttling
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nDone! ${allQuotes.length} quotes fetched`);
  window.fetchedRates = allQuotes;

  // Generate tab-separated CSV
  if (allQuotes.length > 0) {
    const headers = Object.keys(allQuotes[0]);
    const csv = [
      headers.join('\t'),
      ...allQuotes.map(row => headers.map(h => row[h]).join('\t'))
    ].join('\n');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `fex_rates_${CONFIG.state}_${CONFIG.sex}_${CONFIG.tobacco}.csv`;
    a.click();
    console.log('CSV file downloaded!');
  }

  return allQuotes;
};

fetchFEXRates();
```

## FEX Request Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `faceAmount` | number | Coverage amount ($5,000 - $75,000 typical) |
| `coverageType` | `'Level'`, `'Graded'` | Coverage type (Level = immediate full benefit) |
| `sex` | `'Male'`, `'Female'` | Applicant gender |
| `state` | Two-letter code | State code (e.g., 'IL', 'OH', 'CA') |
| `age` | number | Applicant age (20-85 typical) |
| `tobacco` | `'None'`, `'Tobacco'` | Tobacco usage status |
| `feet` | `''` | Leave empty (optional height field) |
| `inches` | `''` | Leave empty (optional height field) |
| `weight` | `''` | Leave empty (optional weight field) |
| `paymentType` | `'Bank Draft/EFT'` | Payment method |
| `toolkit` | `'FEX'` | Product type (Final Expense) |

## Key Differences from Term Life

| Feature | Term Life | Final Expense |
|---------|-----------|---------------|
| Toolkit | `'TERM'` | `'FEX'` |
| Term parameter | Required (`'10'`, `'20'`, etc.) | Not used |
| Coverage type | Not used | Required (`'Level'`, `'Graded'`) |
| Height/weight fields | Not used | Required (can be empty strings) |
| Face amounts | $25K - $1M+ | $5K - $75K typical |
| Age range | 18-75 typical | 20-85 typical |

## Rate Limiting Notes

The FEX endpoint has stricter rate limiting than Term Life. The script uses:
- **500ms delay** between individual requests
- **1 second pause** between age groups

Without these delays, you may get errors around request 100. If you still see errors, increase the delays.

## Troubleshooting

**400 Bad Request**: Make sure `feet`, `inches`, and `weight` fields are included (can be empty strings).

**Rate limiting errors**: Increase the delay values in the script (500ms → 750ms, 1000ms → 1500ms).

**Commas in values breaking CSV**: The script already handles this by parsing with `.replace(/,/g, '')`.

**term_years column empty**: This is correct for FEX - whole life has no term. The import will handle this.
