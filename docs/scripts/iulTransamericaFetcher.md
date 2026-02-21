# Transamerica IUL Rate Fetcher - Direct Portal

## Browser Console Script - Transamerica FFIUL II

**How it works:**

1. You log into the Transamerica agent portal
2. Paste the script into DevTools Console
3. Script creates quotes with different demographics via the portal API
4. For each quote, it iterates face amounts and extracts illustration data
5. Downloads results as CSV

**What it fetches:**

- Ages: 25, 30, 35, 40, 45, 50, 55, 60, 65
- Genders: Male, Female
- Risk Classes: Select NT, Preferred NT, Standard NT
- Face Amounts: $50k, $75k, $100k
- Product: Transamerica FFIUL II (TLIC_FFIULII)

**Stats:**

- 54 quote creations (9 ages × 2 genders × 3 risk classes)
- 162 illustration updates (54 quotes × 3 face amounts)
- ~15-20 minutes with conservative rate limiting

## How to Use

1. Navigate to: https://lifeinsurance.transamerica.com/agent/quote/input
2. Make sure you are **logged in** (you should see the quote form)
3. Open DevTools Console (F12)
4. Copy/paste the ENTIRE script below
5. Press Enter
6. Script runs automatically
7. CSV downloads when done

**Note:** You may see 400/500 errors in console — the script handles these and continues.

## Script

```javascript
// ============================================
// TRANSAMERICA IUL RATE FETCHER
// Direct portal scraping via Remix data API
// ============================================

const TA_CONFIG = {
  state: "AL",
  faceAmounts: [50000, 75000, 100000],
  ages: [25, 30, 35, 40, 45, 50, 55, 60, 65],
  genders: ["male", "female"],
  riskClasses: [
    { code: "select_non_tobacco", label: "Select NT" },
    { code: "preferred_non_tobacco", label: "Preferred NT" },
    { code: "standard_non_tobacco", label: "Standard NT" },
  ],
  // Illustration defaults
  solveBy: "ISB_COVERAGE",
  solveMode: "IM_MAXIMIZE_PROTECTION",
  billingMode: "MONTHLY",
  deathBenefitOption: "IDBO_LEVEL",
  premiumDuration: "MAX",
  premiumDurationAge: "65",
  income: "false",
  bankDisclosure: "false",
  disbursementAge: "66",
  yearsToWithdraw: "20",
  indexAllocation: JSON.stringify([
    { key: "Fund2", allocation: 100 },
    { key: "Fund1", allocation: 0 },
    { key: "Fund3", allocation: 0 },
    { key: "Fund4", allocation: 0 },
    { key: "Fund5", allocation: 0 },
  ]),
  productLineCode: "TLIC_FFIULII",
  productLineVersion: "1.0",
};

const BASE_URL = "https://lifeinsurance.transamerica.com";
const DATA_SUFFIX = "?_data=routes%2F_main.%24basePath.%24";

// Convert target age to a DOB string (MM/DD/YYYY)
const ageToDob = (targetAge) => {
  const today = new Date();
  const birthYear = today.getFullYear() - targetAge;
  // Use June 15 as a stable mid-year date to avoid edge cases
  return `06/15/${birthYear}`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Create a new quote and return the quote ID
const createQuote = async (gender, age, riskClass) => {
  const dob = ageToDob(age);
  const body = new URLSearchParams({
    gender,
    birth_date: dob,
    date_of_birth: dob,
    state: TA_CONFIG.state,
    riskClass: riskClass.code,
    interactionId: "check-quote-with-iul-eligibility",
    product_line_code: TA_CONFIG.productLineCode,
    product_line_version: TA_CONFIG.productLineVersion,
  });

  const res = await fetch(`${BASE_URL}/agent/quote/input${DATA_SUFFIX}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  // Remix returns 204 with x-remix-redirect header containing the quote URL
  const redirectUrl = res.headers.get("x-remix-redirect");
  if (redirectUrl) {
    const match = redirectUrl.match(/\/agent\/iul\/([a-f0-9-]+)/);
    if (match) return match[1];
    throw new Error(`Unexpected redirect URL: ${redirectUrl}`);
  }

  // Fallback: try parsing response body
  if (res.ok && res.status !== 204) {
    const data = await res.json();
    if (data.viewContext?.quoteById?.id) return data.viewContext.quoteById.id;
    if (data.quoteId) return data.quoteId;
  }

  throw new Error(
    `Could not extract quote ID. Status: ${res.status}, redirect header: ${redirectUrl}`,
  );
};

// Update illustration with a specific face amount and fetch results
const updateIllustration = async (quoteId, faceAmount, dob) => {
  const body = new URLSearchParams({
    interactionId: "update-iul-illustration",
    dateOfBirth: dob,
    solveBy: TA_CONFIG.solveBy,
    solveMode: TA_CONFIG.solveMode,
    faceAmount: String(faceAmount),
    premiumMonthly: "0",
    premiumAnnual: "0",
    indexAllocation: TA_CONFIG.indexAllocation,
    billingMode: TA_CONFIG.billingMode,
    deathBenefitOption: TA_CONFIG.deathBenefitOption,
    premiumDuration: TA_CONFIG.premiumDuration,
    premiumDurationAge: TA_CONFIG.premiumDurationAge,
    income: TA_CONFIG.income,
    bankDisclosure: TA_CONFIG.bankDisclosure,
    disbursementAge: TA_CONFIG.disbursementAge,
    yearsToWithdraw: TA_CONFIG.yearsToWithdraw,
  });

  // POST to update the illustration (returns 204 on success)
  const updateRes = await fetch(
    `${BASE_URL}/agent/iul/${quoteId}${DATA_SUFFIX}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
  );

  if (!updateRes.ok && updateRes.status !== 204) {
    throw new Error(
      `Update illustration failed: ${updateRes.status} ${updateRes.statusText}`,
    );
  }

  // Wait for server to process the illustration recalculation
  await sleep(1500);

  const dataRes = await fetch(
    `${BASE_URL}/agent/iul/${quoteId}${DATA_SUFFIX}`,
    { method: "GET" },
  );

  if (!dataRes.ok) {
    throw new Error(
      `Fetch illustration failed: ${dataRes.status} ${dataRes.statusText}`,
    );
  }

  return await dataRes.json();
};

// Extract the data we care about from the illustration response
const extractData = (response, gender, age, riskClass, faceAmount) => {
  const ctx = response.viewContext || response;
  const illus = ctx.iulIllustration;
  const quote = ctx.quoteById;
  const data = illus?.data;

  if (!data) {
    return null;
  }

  // Convert cents to dollars
  const c2d = (cents) => {
    if (!cents) return 0;
    return parseInt(cents, 10) / 100;
  };

  return {
    gender: gender,
    age: age,
    risk_class: riskClass.label,
    face_amount: faceAmount,
    monthly_premium: c2d(quote?.coverage?.premiumMonthlyCents),
    annual_target_premium: c2d(data.targetPremiumCents),
    annual_min_no_lapse: c2d(data.annualMinNoLapsePremiumCents),
    monthly_min_no_lapse: c2d(data.monthlyMinNoLapsePremiumCents),
    initial_monthly_premium: c2d(data.initialMonthlyPremiumCents),
    guideline_level_premium: c2d(data.guidelineLevelPremiumCents),
    guideline_single_premium: c2d(data.guidelineSinglePremiumCents),
    account_value_at_65: c2d(data.accountValueRetirementCents),
    guaranteed_lapse_year: data.guaranteedPolicyLapseYear || "",
    state: TA_CONFIG.state,
    product: "Transamerica FFIUL II",
  };
};

// Main fetcher
const fetchAllRates = async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 Transamerica IUL Rate Fetcher");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const totalQuotes =
    TA_CONFIG.ages.length *
    TA_CONFIG.genders.length *
    TA_CONFIG.riskClasses.length;
  const totalRequests = totalQuotes * TA_CONFIG.faceAmounts.length;

  console.log(`📍 State: ${TA_CONFIG.state}`);
  console.log(`👤 Demographics: ${totalQuotes} combinations`);
  console.log(`💰 Face amounts: ${TA_CONFIG.faceAmounts.map((f) => `$${(f / 1000).toFixed(0)}k`).join(", ")}`);
  console.log(`📈 Total illustrations: ${totalRequests}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allResults = [];
  const errors = [];
  let quoteCount = 0;
  let illustrationCount = 0;
  const startTime = Date.now();

  for (const gender of TA_CONFIG.genders) {
    for (const riskClass of TA_CONFIG.riskClasses) {
      for (const age of TA_CONFIG.ages) {
        quoteCount++;
        const dob = ageToDob(age);

        // Step 1: Create quote
        let quoteId;
        try {
          console.log(
            `[${quoteCount}/${totalQuotes}] Creating quote: ${gender} age ${age} ${riskClass.label}...`,
          );
          quoteId = await createQuote(gender, age, riskClass);
          console.log(`  ✓ Quote created: ${quoteId}`);
        } catch (e) {
          console.error(
            `  ✗ Failed to create quote: ${gender} age ${age} ${riskClass.label} — ${e.message}`,
          );
          errors.push({
            step: "create",
            gender,
            age,
            riskClass: riskClass.label,
            error: e.message,
          });
          await sleep(2000);
          continue;
        }

        await sleep(1500);

        // Step 2: Iterate face amounts
        for (const faceAmount of TA_CONFIG.faceAmounts) {
          illustrationCount++;
          try {
            console.log(
              `  [${illustrationCount}/${totalRequests}] Face: $${faceAmount.toLocaleString()}...`,
            );
            const response = await updateIllustration(
              quoteId,
              faceAmount,
              dob,
            );
            const extracted = extractData(
              response,
              gender,
              age,
              riskClass,
              faceAmount,
            );

            if (extracted) {
              allResults.push(extracted);
              console.log(
                `    ✓ Monthly: $${extracted.monthly_premium} | Target: $${extracted.annual_target_premium}/yr | No-lapse: $${extracted.monthly_min_no_lapse}/mo`,
              );
            } else {
              console.warn(`    ⚠ No illustration data returned`);
              errors.push({
                step: "extract",
                gender,
                age,
                riskClass: riskClass.label,
                faceAmount,
                error: "No data in response",
              });
            }
          } catch (e) {
            console.error(
              `    ✗ Failed: $${faceAmount.toLocaleString()} — ${e.message}`,
            );
            errors.push({
              step: "illustration",
              gender,
              age,
              riskClass: riskClass.label,
              faceAmount,
              error: e.message,
            });

            // If 429, pause longer
            if (e.message.includes("429")) {
              console.warn("    ⏸ Rate limited, pausing 30 seconds...");
              await sleep(30000);
            }
          }

          await sleep(1000);
        }

        // Progress update
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = illustrationCount / elapsed;
        const remaining = (totalRequests - illustrationCount) / rate;
        console.log(
          `  Progress: ${illustrationCount}/${totalRequests} | Collected: ${allResults.length} | ETA: ${Math.ceil(remaining / 60)}m\n`,
        );

        // Pause between quote groups
        await sleep(3000);
      }
    }
  }

  // Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Done! ${allResults.length} rates collected`);
  if (errors.length > 0) {
    console.log(`⚠ ${errors.length} errors encountered`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Store for inspection
  window.taResults = allResults;
  window.taErrors = errors;

  // Generate CSV
  if (allResults.length > 0) {
    const headers = Object.keys(allResults[0]);

    const csvEscape = (val) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvContent = [
      headers.join(","),
      ...allResults.map((row) =>
        headers.map((h) => csvEscape(row[h])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transamerica_iul_${TA_CONFIG.state}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`📁 CSV downloaded: ${a.download}`);
  } else {
    console.warn("⚠ No results to download");
  }

  if (errors.length > 0) {
    console.log("\n📋 Errors:");
    console.table(errors);
  }

  return allResults;
};

// Start automatically
fetchAllRates();
```

## CSV Columns

| Column                   | Description                              | Example           |
| ------------------------ | ---------------------------------------- | ----------------- |
| gender                   | Male/Female                              | male              |
| age                      | Issue age                                | 40                |
| risk_class               | Underwriting class                       | Select NT         |
| face_amount              | Death benefit                            | 100000            |
| monthly_premium          | Monthly premium (solve for coverage)     | 155.30            |
| annual_target_premium    | Annual target premium                    | 3067.50           |
| annual_min_no_lapse      | Annual minimum no-lapse guarantee premium| 1717.44           |
| monthly_min_no_lapse     | Monthly minimum no-lapse premium         | 143.12            |
| initial_monthly_premium  | Initial calculated monthly premium       | 155.30            |
| guideline_level_premium  | 7702 guideline level premium             | 4274.00           |
| guideline_single_premium | 7702 guideline single premium            | 62671.00          |
| account_value_at_65      | Projected account value at age 65        | 52748.00          |
| guaranteed_lapse_year    | Year policy lapses on guaranteed basis   | 21                |
| state                    | State code                               | AL                |
| product                  | Product name                             | Transamerica FFIUL II |

## Customization

**Change face amounts:**
```javascript
TA_CONFIG.faceAmounts = [50000, 75000, 100000, 150000, 250000];
```

**Change ages:**
```javascript
TA_CONFIG.ages = [30, 35, 40, 45, 50, 55, 60];
```

**Change state:**
```javascript
TA_CONFIG.state = "IL";
```

**Add tobacco risk classes:**
```javascript
TA_CONFIG.riskClasses = [
  { code: "select_non_tobacco", label: "Select NT" },
  { code: "preferred_non_tobacco", label: "Preferred NT" },
  { code: "standard_non_tobacco", label: "Standard NT" },
  { code: "preferred_tobacco", label: "Preferred T" },
  { code: "standard_tobacco", label: "Standard T" },
];
```

## Troubleshooting

**"Could not extract quote ID from response":**

- The response format may differ from expected. Check `window.taErrors` for details.
- Open the script, find the `createQuote` function, and check the logged response.
- You may need to adjust how the quote ID is extracted.

**Authentication errors (401/403):**

- Your session expired. Refresh the page, log in again, then re-paste the script.

**Rate limiting (429):**

- Script auto-pauses 30 seconds on 429 errors.
- If persistent, increase sleep times in the script.

**premiumMonthly shows 0:**

- The `premiumMonthly: "0"` in the update body might need a real value.
- Check `window.taResults` — if monthly_premium is 0 but initial_monthly_premium has a value, use that column instead.
- Alternatively, try changing `solveMode` to `IM_SOLVE_PREMIUM` if you want to solve for premium given coverage.

**Some risk classes return errors:**

- Not all risk classes are available for all ages/genders.
- The script skips errors and continues. Check `window.taErrors` for which combos failed.

**Want to inspect raw responses:**

```javascript
// After running, check results and errors:
console.table(window.taResults);
console.table(window.taErrors);
```

## How This Differs from InsuranceToolkits IUL Fetcher

| Aspect               | InsuranceToolkits           | Transamerica Direct         |
| -------------------- | --------------------------- | --------------------------- |
| API                  | insurancetoolkits.com       | lifeinsurance.transamerica.com |
| Auth                 | Bearer token (localStorage) | Session cookies (portal login) |
| Multi-carrier        | Yes (select one)            | No (Transamerica only)      |
| Data depth           | Monthly/yearly premium      | Full illustration with projections |
| Face amount control  | In request body             | Separate illustration update |
| Rate classes         | tier_name from response     | Set in request              |
| Projections          | None                        | Year-by-year chart data     |
