# Rate Fetching Scripts - CPT Mode (Cost Per Thousand)

## Overview

These scripts fetch insurance rates from Insurance Toolkits at a **single reference face amount**, allowing the Quick Quote system to calculate premiums for any face amount using rate-per-thousand math.

**Why CPT Mode?**

- ~8x fewer API requests (one face amount instead of eight)
- ~8x less data to store and import
- Same accuracy for term/whole life (premiums scale linearly with face amount)

---

## CPT Calculation Formula

The Quick Quote system uses this formula when only one face amount exists in the rate data:

```
Rate Per Thousand = Known Premium ÷ (Known Face Amount ÷ 1000)
Calculated Premium = Rate Per Thousand × (Requested Face Amount ÷ 1000)
```

### Example

**Stored rate:** Age 35, Male, Non-Tobacco, 20yr term, $100,000 face = $15.50/month

```
Rate Per Thousand = $15.50 ÷ (100,000 ÷ 1000)
                  = $15.50 ÷ 100
                  = $0.155 per thousand

Quote for $250,000 = $0.155 × 250 = $38.75/month
Quote for $500,000 = $0.155 × 500 = $77.50/month
Quote for $1,000,000 = $0.155 × 1000 = $155.00/month
```

### Implementation Location

The CPT calculation is implemented in:

- **File:** `src/services/underwriting/premiumMatrixService.ts`
- **Function:** `interpolatePremium()` (lines 477-518)
- **Trigger:** Automatically used when `faceAmounts.length === 1` in the filtered rate data

---

## Prerequisites

1. Be logged into https://app.insurancetoolkits.com
2. Navigate to the appropriate quoter:
   - **Term:** https://app.insurancetoolkits.com/term/quoter
   - **FEX:** https://app.insurancetoolkits.com/fex/quoter
3. Open browser DevTools (F12) → Console tab
4. Paste and run the script

---

## Script 1: Term Life - Additional Face Amounts

Fetches rates for all gender/tobacco/term combinations at **multiple face amounts** for accurate interpolation.
Use this if you already have $100k rates and need additional face amounts.

**Face amounts:** $50k, $250k, $500k, $1M (skips $100k)

**Stats:**

- 5,040 API requests (63 ages × 2 genders × 2 tobacco × 5 terms × 4 face amounts)
- ~40-50 minutes runtime
- Downloads: `term_rates_additional.csv`

```javascript
const fetchAdditionalTermRates = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    console.error("Not logged in!");
    return;
  }

  const quotes = [];
  const genders = ["Male", "Female"];
  const tobaccos = ["None", "Tobacco"];
  const terms = ["10", "15", "20", "25", "30"];
  const faceAmounts = [50000, 250000, 500000, 1000000]; // Skip 100k - already imported
  const total =
    63 * genders.length * tobaccos.length * terms.length * faceAmounts.length;
  let current = 0;

  console.log(`Fetching ${total} rates... ETA ~40-50 minutes`);

  for (const faceAmount of faceAmounts) {
    console.log(`\n📊 Starting $${faceAmount.toLocaleString()} face amount...`);

    for (const sex of genders) {
      for (const tobacco of tobaccos) {
        for (const term of terms) {
          for (let age = 18; age <= 80; age++) {
            current++;
            try {
              const res = await fetch(
                "https://api.insurancetoolkits.com/quoter/",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    faceAmount,
                    sex,
                    term,
                    state: "IL",
                    age,
                    tobacco,
                    paymentType: "Bank Draft/EFT",
                    underwritingItems: [],
                    toolkit: "TERM",
                  }),
                },
              );
              const data = await res.json();
              if (data.quotes) {
                data.quotes.forEach((q) =>
                  quotes.push({
                    face_amount: faceAmount,
                    company: q.company,
                    plan_name: q.plan_name,
                    tier_name: q.tier_name,
                    monthly: q.monthly,
                    yearly: q.yearly,
                    state: "IL",
                    gender: sex,
                    age,
                    term_years: term,
                    tobacco,
                  }),
                );
              }
            } catch (e) {
              console.error(
                `Error: ${faceAmount}/${sex}/${tobacco}/${term}yr/age${age}`,
              );
            }

            if (current % 100 === 0)
              console.log(
                `Progress: ${current}/${total} (${Math.round((current / total) * 100)}%)`,
              );

            await new Promise((r) => setTimeout(r, 300));
            if (current % 50 === 0) {
              console.log("⏸️ Pausing 5s...");
              await new Promise((r) => setTimeout(r, 5000));
            }
          }
          console.log(
            `✓ $${faceAmount.toLocaleString()} ${sex} ${tobacco} ${term}yr`,
          );
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }
  }

  console.log(`\n✅ Done! ${quotes.length} rates fetched`);

  const headers = Object.keys(quotes[0]);
  const csv = [
    headers.join(","),
    ...quotes.map((r) =>
      headers
        .map((h) => {
          const v = String(r[h] ?? "");
          return v.includes(",") ? `"${v}"` : v;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "term_rates_additional.csv";
  a.click();

  window.fetchedRates = quotes;
  console.log("📁 CSV downloaded: term_rates_additional.csv");
  return quotes;
};

fetchAdditionalTermRates();
```

---

## Script 1B: Term Life - Single Face Amount (CPT Only)

Use this for initial import with CPT calculation (single reference face amount).

**Stats:**

- 1,260 API requests (63 ages × 2 genders × 2 tobacco × 5 terms)
- ~10-12 minutes runtime
- Downloads: `term_rates_all_CPT.csv`

```javascript
const fetchAllTermRates = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    console.error("Not logged in!");
    return;
  }

  const quotes = [];
  const genders = ["Male", "Female"];
  const tobaccos = ["None", "Tobacco"];
  const terms = ["10", "15", "20", "25", "30"];
  const total = 63 * genders.length * tobaccos.length * terms.length;
  let current = 0;

  console.log(`Fetching ${total} rates... ETA ~10-12 minutes`);

  for (const sex of genders) {
    for (const tobacco of tobaccos) {
      for (const term of terms) {
        for (let age = 18; age <= 80; age++) {
          current++;
          try {
            const res = await fetch(
              "https://api.insurancetoolkits.com/quoter/",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  faceAmount: 100000,
                  sex,
                  term,
                  state: "IL",
                  age,
                  tobacco,
                  paymentType: "Bank Draft/EFT",
                  underwritingItems: [],
                  toolkit: "TERM",
                }),
              },
            );
            const data = await res.json();
            if (data.quotes) {
              data.quotes.forEach((q) =>
                quotes.push({
                  face_amount: 100000,
                  company: q.company,
                  plan_name: q.plan_name,
                  tier_name: q.tier_name,
                  monthly: q.monthly,
                  yearly: q.yearly,
                  state: "IL",
                  gender: sex,
                  age,
                  term_years: term,
                  tobacco,
                }),
              );
            }
          } catch (e) {
            console.error(`Error: ${sex}/${tobacco}/${term}yr/age${age}`);
          }

          if (current % 50 === 0)
            console.log(
              `Progress: ${current}/${total} (${Math.round((current / total) * 100)}%)`,
            );

          // Rate limiting
          await new Promise((r) => setTimeout(r, 300));
          if (current % 50 === 0) {
            console.log("⏸️ Pausing 5s to avoid rate limit...");
            await new Promise((r) => setTimeout(r, 5000));
          }
        }
        console.log(`✓ ${sex} ${tobacco} ${term}yr`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  console.log(`\n✅ Done! ${quotes.length} rates fetched`);

  // Auto-download CSV
  const headers = Object.keys(quotes[0]);
  const csv = [
    headers.join(","),
    ...quotes.map((r) =>
      headers
        .map((h) => {
          const v = String(r[h] ?? "");
          return v.includes(",") ? `"${v}"` : v;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "term_rates_all_CPT.csv";
  a.click();

  window.fetchedRates = quotes;
  console.log("📁 CSV downloaded: term_rates_all_CPT.csv");
  return quotes;
};

fetchAllTermRates();
```

### Term Life CSV Columns

| Column      | Description                           | Example                            |
| ----------- | ------------------------------------- | ---------------------------------- |
| face_amount | Reference face amount (always 100000) | 100000                             |
| company     | Carrier with product name             | "Transamerica (Trendsetter Super)" |
| plan_name   | Full plan name                        | "Trendsetter Super 2021"           |
| tier_name   | Health class tier                     | "Preferred Plus", "Standard"       |
| monthly     | Monthly premium at reference face     | 15.50                              |
| yearly      | Annual premium at reference face      | 178.25                             |
| state       | State code                            | IL                                 |
| gender      | Male/Female                           | Male                               |
| age         | Issue age                             | 35                                 |
| term_years  | Term length                           | 20                                 |
| tobacco     | None/Tobacco                          | None                               |

---

## Script 2: Final Expense / Whole Life (All Combinations + Multiple Face Amounts)

Fetches rates for all gender/tobacco/coverage type combinations at **multiple face amounts** for accurate interpolation.

**Face amounts:** $5k, $10k, $25k, $40k, $50k (5 points for interpolation)

**Stats:**

- 3,960 API requests (66 ages × 2 genders × 2 tobacco × 3 coverage types × 5 face amounts)
- ~35-40 minutes runtime
- Downloads: `fex_rates_all.csv`

```javascript
const fetchAllFEXRates = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    console.error("Not logged in!");
    return;
  }

  const quotes = [];
  const genders = ["Male", "Female"];
  const tobaccos = ["None", "Tobacco"];
  const coverageTypes = ["Level", "Graded/Modified", "Guaranteed"];
  const faceAmounts = [5000, 10000, 25000, 40000, 50000];
  const ages = [];
  for (let age = 20; age <= 85; age++) ages.push(age);

  const total = ages.length * genders.length * tobaccos.length * coverageTypes.length * faceAmounts.length;
  let current = 0;

  console.log(`Fetching ${total} FEX rates... ETA ~35-40 minutes`);

  for (const faceAmount of faceAmounts) {
    console.log(`\n📊 Starting $${faceAmount.toLocaleString()} face amount...`);

    for (const sex of genders) {
      for (const tobacco of tobaccos) {
        for (const coverageType of coverageTypes) {
          for (const age of ages) {
            current++;
            try {
              const res = await fetch(
                "https://api.insurancetoolkits.com/quoter/",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    faceAmount,
                    coverageType,
                    sex,
                    state: "IL",
                    age,
                    tobacco,
                    feet: "",
                    inches: "",
                    weight: "",
                    paymentType: "Bank Draft/EFT",
                    underwritingItems: [],
                    toolkit: "FEX",
                  }),
                },
              );
              const data = await res.json();
              if (data.quotes) {
                data.quotes.forEach((q) => {
                  const parseNum = (s) =>
                    s ? parseFloat(String(s).replace(/,/g, "")) : 0;
                  quotes.push({
                    face_amount: faceAmount,
                    company: q.company,
                    plan_name: q.plan_name,
                    tier_name: q.tier_name,
                    monthly: parseNum(q.monthly),
                    yearly: parseNum(q.yearly),
                    state: "IL",
                    gender: sex,
                    age: age,
                    term_years: "",
                    tobacco: tobacco,
                  });
                });
              }
            } catch (e) {
              console.error(`Error: ${faceAmount}/${sex}/${tobacco}/${coverageType}/age${age}`);
            }

            if (current % 100 === 0)
              console.log(
                `Progress: ${current}/${total} (${Math.round((current / total) * 100)}%)`,
              );

            await new Promise((r) => setTimeout(r, 300));
            if (current % 50 === 0) {
              console.log("⏸️ Pausing 5s...");
              await new Promise((r) => setTimeout(r, 5000));
            }
          }
          console.log(`✓ $${faceAmount.toLocaleString()} ${sex} ${tobacco} ${coverageType}`);
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }
  }

  console.log(`\n✅ Done! ${quotes.length} FEX rates fetched`);

  // Auto-download CSV
  const headers = Object.keys(quotes[0]);
  const csv = [
    headers.join(","),
    ...quotes.map((r) =>
      headers
        .map((h) => {
          const v = String(r[h] ?? "");
          return v.includes(",") ? `"${v}"` : v;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fex_rates_all.csv";
  a.click();

  window.fetchedRates = quotes;
  console.log("📁 CSV downloaded: fex_rates_all.csv");
  return quotes;
};

fetchAllFEXRates();
```

### FEX CSV Columns

| Column      | Description                          | Example                            |
| ----------- | ------------------------------------ | ---------------------------------- |
| face_amount | Reference face amount (always 25000) | 25000                              |
| company     | Carrier with product name            | "Mutual of Omaha (Living Promise)" |
| plan_name   | Full plan name                       | "Living Promise Level"             |
| tier_name   | Product tier                         | "Level", "Preferred"               |
| monthly     | Monthly premium at reference face    | 89.50                              |
| yearly      | Annual premium at reference face     | 1028.25                            |
| state       | State code                           | IL                                 |
| gender      | Male/Female                          | Male                               |
| age         | Issue age                            | 65                                 |
| term_years  | Empty for whole life                 | (empty)                            |
| tobacco     | None/Tobacco                         | None                               |

---

## Comparison: Term vs FEX

| Parameter          | Term Life          | FEX/Whole Life   |
| ------------------ | ------------------ | ---------------- |
| Toolkit            | `'TERM'`           | `'FEX'`          |
| Term years         | 10, 15, 20, 25, 30 | None (permanent) |
| Coverage type      | N/A                | Level or Graded  |
| Age range          | 18-80              | 20-85            |
| Reference face     | $100,000           | $25,000          |
| Typical face range | $50k - $1M+        | $5k - $50k       |

---

## Import Process

After CSV downloads:

1. Go to **Settings → Underwriting → Rate Entry**
2. Click **Import CSV** button
3. Open downloaded CSV in Excel/Sheets
4. Select all (Ctrl+A), Copy (Ctrl+C)
5. Paste into Import dialog
6. Click **Parse CSV**
7. Map carriers/products to database entries
8. Click **Import**

---

## Accuracy Testing

To verify CPT calculations are accurate:

1. **Pick a test case:** e.g., Male, 35, Non-Tobacco, 20yr, $250,000
2. **Run Quick Quote** in the app → note calculated premium
3. **Manual quote in Insurance Toolkits** with same params → note actual premium
4. **Compare:** Should be within ~$0.01-0.10 (rounding differences)

### Expected Accuracy

- **Term Life:** Very accurate (premiums are strictly linear with face amount)
- **Whole Life:** Very accurate (same linear relationship)
- **Some carriers:** May have slight non-linear pricing at extreme face amounts

---

## Rate Limiting Notes

Insurance Toolkits has rate limiting that kicks in around 100 requests. The scripts use:

- **300ms delay** between requests
- **5 second pause** every 50 requests
- **3 second pause** between classification groups

If you still hit rate limits, increase delays:

```javascript
await new Promise((r) => setTimeout(r, 500)); // Increase from 300
await new Promise((r) => setTimeout(r, 8000)); // Increase from 5000
```

---

## Clearing Existing Rates

To start fresh before importing new CPT rates:

```javascript
// Run in Node.js or create a script
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const { error, count } = await supabase
  .from("premium_matrix")
  .delete({ count: "exact" })
  .neq("id", "00000000-0000-0000-0000-000000000000");

console.log(`Deleted ${count} rows`);
```

---

## Related Files

| File                                                | Purpose                                   |
| --------------------------------------------------- | ----------------------------------------- |
| `src/services/underwriting/premiumMatrixService.ts` | CPT calculation in `interpolatePremium()` |
| `src/services/underwriting/quotingService.ts`       | Quote generation using premium data       |
| `src/features/underwriting/components/QuickQuote/`  | Quick Quote UI components                 |
| `docs/insurance-toolkits-rate-fetcher.md`           | Original rate fetcher documentation       |
