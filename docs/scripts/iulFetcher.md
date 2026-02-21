# Indexed Universal Life (IUL) Rate Fetcher - Interactive Carrier Selection

## Interactive Script - IUL

**How it works:**

1. Fetches a sample quote to see available carriers
2. Shows you a numbered list of carriers in the console
3. You type a number to select the carrier
4. Script fetches ALL rates for that carrier only

**What it fetches:**

- Ages: 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75
- Genders: Male, Female
- Tobacco: None, Tobacco
- Face Amounts: $100k, $150k, $250k, $500k, $750k, $1M
- Coverage Type: None (IUL is permanent indexed coverage)

**Stats:**

- 576 API requests (12 ages x 2 genders x 2 tobacco x 6 faces)
- ~8-10 minutes with conservative rate limiting (600ms delays + pauses)

## How to Use

1. Navigate to: https://app.insurancetoolkits.com/iul/quoter
2. Open DevTools Console (F12)
3. Copy/paste the ENTIRE script below
4. Press Enter
5. **Wait** for the carrier list to appear
6. **Type** `selectCarrier(1)` (or 2, 3, etc.) to pick a carrier
7. Script runs automatically
8. CSV downloads when done

**Note:** You may see red 400 errors and "message channel closed" warnings in console - this is NORMAL. The script handles these automatically and continues running. Don't stop the script!

## Script

```javascript
// ============================================
// IUL RATE FETCHER - INTERACTIVE
// ============================================

let AVAILABLE_CARRIERS = [];
let SELECTED_CARRIER = null;

// Step 1: Fetch sample to discover carriers
const discoverCarriers = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    console.error("❌ No access token found. Make sure you are logged in.");
    return;
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 IUL Rate Fetcher - Interactive Mode");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 Fetching sample quote to discover carriers...\n");

  try {
    const res = await fetch("https://api.insurancetoolkits.com/quoter/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        faceAmount: 250000,
        sex: "Male",
        state: "IL",
        age: 45,
        tobacco: "None",
        feet: "",
        inches: "",
        weight: "",
        paymentType: "Bank Draft/EFT",
        underwritingItems: [],
        toolkit: "IUL",
      }),
    });

    const data = await res.json();

    if (!data.quotes || data.quotes.length === 0) {
      console.error("❌ No quotes returned. Check your login status.");
      console.log("Response:", JSON.stringify(data, null, 2));
      return;
    }

    // Extract unique carrier names
    const carrierSet = new Set();
    data.quotes.forEach((q) => {
      // Extract carrier name before parentheses
      const match = q.company.match(/^([^(]+)/);
      if (match) {
        carrierSet.add(match[1].trim());
      }
    });

    AVAILABLE_CARRIERS = Array.from(carrierSet).sort();

    console.log("✅ Available IUL Carriers:\n");
    AVAILABLE_CARRIERS.forEach((carrier, index) => {
      console.log(`  ${index + 1}. ${carrier}`);
    });

    // Show a sample of the response fields so user can verify
    console.log("\n📋 Sample quote fields from first result:");
    const sample = data.quotes[0];
    console.log("   Keys:", Object.keys(sample).join(", "));

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👉 To select a carrier, type:");
    console.log("   selectCarrier(1)  // Replace 1 with your carrier number");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Store full sample for debugging
    window.sampleQuotes = data.quotes;
    console.log(
      "💡 Tip: Type window.sampleQuotes to inspect full API response",
    );
  } catch (e) {
    console.error("❌ Error fetching sample:", e.message);
  }
};

// Step 2: User selects carrier
window.selectCarrier = (number) => {
  if (!AVAILABLE_CARRIERS || AVAILABLE_CARRIERS.length === 0) {
    console.error("❌ No carriers available. Run discoverCarriers() first.");
    return;
  }

  const index = number - 1;
  if (index < 0 || index >= AVAILABLE_CARRIERS.length) {
    console.error(
      `❌ Invalid number. Please choose 1-${AVAILABLE_CARRIERS.length}`,
    );
    return;
  }

  SELECTED_CARRIER = AVAILABLE_CARRIERS[index];
  console.log(`\n✅ Selected: ${SELECTED_CARRIER}`);
  console.log("🚀 Starting rate fetch...\n");

  // Start the full fetch
  fetchAllRates();
};

// Step 3: Fetch all rates for selected carrier
const fetchAllRates = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    console.error("❌ No access token found.");
    return;
  }

  if (!SELECTED_CARRIER) {
    console.error("❌ No carrier selected.");
    return;
  }

  const CONFIG = {
    state: "IL",
    faceAmounts: [100000, 150000, 250000, 500000, 750000, 1000000],
    ages: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75],
    genders: ["Male", "Female"],
    tobaccos: ["None", "Tobacco"],
  };

  const total =
    CONFIG.ages.length *
    CONFIG.genders.length *
    CONFIG.tobaccos.length *
    CONFIG.faceAmounts.length;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🎯 Carrier: ${SELECTED_CARRIER}`);
  console.log(`📍 State: ${CONFIG.state}`);
  console.log(`📈 Total Requests: ${total.toLocaleString()}`);
  console.log(`⏱️  Estimated Time: ~${Math.ceil((total * 0.6) / 60)} minutes`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allQuotes = [];
  const skippedCombos = [];
  const url = "https://api.insurancetoolkits.com/quoter/";
  let current = 0;
  let errorCount = 0;
  const startTime = Date.now();

  // Helper to parse numeric values with commas
  const parseNum = (s) => {
    if (!s) return 0;
    return parseFloat(String(s).replace(/,/g, ""));
  };

  // Nested loops for all combinations
  for (const sex of CONFIG.genders) {
    for (const tobacco of CONFIG.tobaccos) {
      for (const age of CONFIG.ages) {
        for (const faceAmount of CONFIG.faceAmounts) {
          current++;

          try {
            const res = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                faceAmount,
                sex,
                state: CONFIG.state,
                age,
                tobacco,
                feet: "",
                inches: "",
                weight: "",
                paymentType: "Bank Draft/EFT",
                underwritingItems: [],
                toolkit: "IUL",
              }),
            });

            // Check for bad request (invalid combination)
            if (!res.ok) {
              if (res.status === 400) {
                // 400 = Invalid combination for this carrier, skip silently
                skippedCombos.push(
                  `${sex}/${tobacco}/age${age}/$${faceAmount.toLocaleString()}`,
                );
              } else if (res.status === 429) {
                // Rate limited - pause longer
                console.warn(
                  `⚠️  Rate limited at request ${current}, pausing 15 seconds...`,
                );
                await new Promise((r) => setTimeout(r, 15000));
                errorCount++;

                // If we hit rate limit multiple times, slow down even more
                if (errorCount > 3) {
                  console.warn(
                    `⚠️  Repeated rate limiting, pausing 45 seconds...`,
                  );
                  await new Promise((r) => setTimeout(r, 45000));
                  errorCount = 0;
                }
              } else {
                // Other HTTP errors
                errorCount++;
                if (errorCount > 10) {
                  console.error(
                    `❌ Too many errors (${errorCount}), pausing 20 seconds...`,
                  );
                  await new Promise((r) => setTimeout(r, 20000));
                  errorCount = 0;
                }
              }

              // Rate limiting: same delay even after error
              await new Promise((r) => setTimeout(r, 600));
              continue;
            }

            // Parse response
            let data;
            try {
              data = await res.json();
            } catch (jsonError) {
              console.error(`❌ Failed to parse JSON at request ${current}`);
              await new Promise((r) => setTimeout(r, 600));
              continue;
            }

            errorCount = 0; // Reset on success

            if (data.quotes && data.quotes.length > 0) {
              for (const q of data.quotes) {
                // Filter to selected carrier only
                if (!q.company.includes(SELECTED_CARRIER)) {
                  continue;
                }

                allQuotes.push({
                  face_amount: faceAmount,
                  company: q.company,
                  plan_name: q.plan_name,
                  tier_name: q.tier_name,
                  coverage_type: "", // IUL has no coverage type distinction
                  monthly: parseNum(q.monthly),
                  yearly: parseNum(q.yearly),
                  state: CONFIG.state,
                  gender: sex,
                  age: age,
                  term_years: "", // Empty for IUL - permanent coverage
                  tobacco: tobacco,
                });
              }
            }

            // Progress every 25 requests
            if (current % 25 === 0) {
              const elapsed = (Date.now() - startTime) / 1000;
              const rate = current / elapsed;
              const remaining = (total - current) / rate;
              console.log(
                `Progress: ${current}/${total} (${Math.round((current / total) * 100)}%) | ` +
                  `Collected: ${allQuotes.length} quotes | Skipped: ${skippedCombos.length} | ` +
                  `ETA: ${Math.ceil(remaining / 60)}m ${Math.ceil(remaining % 60)}s`,
              );
            }

            // Rate limiting: 600ms between requests
            await new Promise((r) => setTimeout(r, 600));

            // Extra pause every 50 requests
            if (current % 50 === 0) {
              console.log(`⏸️  Pausing 5 seconds at request ${current}...`);
              await new Promise((r) => setTimeout(r, 5000));
            }
          } catch (e) {
            console.error(
              `❌ Exception at ${sex}/${tobacco}/age${age}/$${faceAmount.toLocaleString()}:`,
              e.message,
            );
            errorCount++;
          }
        }

        // Pause between age groups
        console.log(
          `✓ Completed: ${sex} ${tobacco} age ${age} - ${allQuotes.length} quotes collected, ${skippedCombos.length} skipped`,
        );
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    `✅ Done! ${allQuotes.length} rates fetched for ${SELECTED_CARRIER}`,
  );
  if (skippedCombos.length > 0) {
    console.log(
      `⚠️  Skipped ${skippedCombos.length} invalid combinations (age/face amount not offered by carrier)`,
    );
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Store in window for inspection
  window.fetchedRates = allQuotes;
  window.skippedCombos = skippedCombos;

  // Generate CSV
  if (allQuotes.length > 0) {
    const headers = Object.keys(allQuotes[0]);

    // CSV escape function
    const csvEscape = (val) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvContent = [
      headers.join(","),
      ...allQuotes.map((row) =>
        headers.map((h) => csvEscape(row[h])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const carrierSafe = SELECTED_CARRIER.replace(/\s+/g, "_");
    a.download = `iul_${CONFIG.state}_${carrierSafe}.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`📁 CSV downloaded: ${a.download}`);
  } else {
    console.warn(`⚠️  No quotes found for ${SELECTED_CARRIER}`);
  }

  return allQuotes;
};

// Auto-run discovery when script loads
discoverCarriers();
```

## Example Usage

After pasting the script, you'll see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 IUL Rate Fetcher - Interactive Mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Fetching sample quote to discover carriers...

✅ Available IUL Carriers:

  1. Allianz
  2. Lincoln Financial
  3. National Life Group
  4. North American
  5. Pacific Life
  ... (etc)

📋 Sample quote fields from first result:
   Keys: company, plan_name, tier_name, monthly, yearly, ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 To select a carrier, type:
   selectCarrier(1)  // Replace 1 with your carrier number
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then you type in the console:

```javascript
selectCarrier(2); // Picks the second carrier
```

And it starts fetching!

## IUL CSV Columns

| Column        | Description                     | Example                                  |
| ------------- | ------------------------------- | ---------------------------------------- |
| face_amount   | Death benefit face amount       | 250000                                   |
| company       | Carrier with product name       | "North American (IUL 20)"               |
| plan_name     | Full plan name                  | "IUL 20"                                 |
| tier_name     | Health class tier               | "Preferred Plus", "Standard"             |
| coverage_type | Empty for IUL                   | (empty)                                  |
| monthly       | Monthly target premium          | 245.50                                   |
| yearly        | Annual target premium           | 2823.25                                  |
| state         | State code                      | IL                                       |
| gender        | Male/Female                     | Male                                     |
| age           | Issue age                       | 45                                       |
| term_years    | Empty for IUL (permanent)       | (empty)                                  |
| tobacco       | None/Tobacco                    | None                                     |

## Comparison: FEX vs IUL

| Parameter          | FEX/Whole Life   | IUL                  |
| ------------------ | ---------------- | -------------------- |
| Toolkit            | `'FEX'`          | `'IUL'`              |
| URL                | /fex/quoter      | /iul/quoter          |
| Term years         | None (permanent) | None (permanent)     |
| Coverage type      | Level/Graded/etc | None                 |
| Age range          | 30-85            | 20-75                |
| Typical face range | $5k - $50k       | $100k - $1M          |
| Use case           | Final Expense    | Cash value / growth  |

## Troubleshooting

**Carrier list doesn't appear:**

- Refresh page and try again
- Check you're logged into Insurance Toolkits
- Make sure you're on the IUL quoter page: https://app.insurancetoolkits.com/iul/quoter

**Can't find selectCarrier function:**

- Make sure you pasted the ENTIRE script
- Try typing `window.selectCarrier(1)` instead

**Want to start over with different carrier:**

- Refresh the page
- Paste script again
- Pick new carrier

**Rate limiting errors:**

- Script already uses conservative 600ms delays
- If still issues, increase to 800ms in the code

**API returns different fields than FEX:**

- The script stores `window.sampleQuotes` from the discovery call
- Type `window.sampleQuotes[0]` to inspect the actual response fields
- If the API returns different field names, update the `allQuotes.push()` block accordingly

**No carriers found / empty response:**

- The IUL toolkit may use different request parameters
- Check `window.sampleQuotes` to see what the API actually returns
- You may need to adjust the sample request body in `discoverCarriers()`
