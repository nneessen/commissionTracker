# Whole Life / Final Expense Rate Fetcher - Interactive Carrier Selection

## Interactive Script - FEX

**How it works:**

1. Fetches a sample quote to see available carriers
2. Shows you a numbered list of carriers in the console
3. You type a number to select the carrier
4. Script fetches ALL rates for that carrier only

**What it fetches:**

- Ages: 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85
- Genders: Male, Female
- Tobacco: None, Tobacco
- Face Amounts: $10k, $15k, $20k, $25k, $30k, $35k, $40k, $45k, $50k, $100k, $150k
- Coverage Type: Level only (can be changed in CONFIG)

**Stats:**

- 528 API requests (12 ages × 2 genders × 2 tobacco × 11 faces)
- ~8-10 minutes with conservative rate limiting (600ms delays + pauses)

## How to Use

1. Navigate to: https://app.insurancetoolkits.com/fex/quoter
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
// FINAL EXPENSE RATE FETCHER - INTERACTIVE
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
  console.log("📊 Final Expense Rate Fetcher - Interactive Mode");
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
        faceAmount: 25000,
        coverageType: "Level",
        sex: "Male",
        state: "IL",
        age: 65,
        tobacco: "None",
        feet: "",
        inches: "",
        weight: "",
        paymentType: "Bank Draft/EFT",
        underwritingItems: [],
        toolkit: "FEX",
      }),
    });

    const data = await res.json();

    if (!data.quotes || data.quotes.length === 0) {
      console.error("❌ No quotes returned. Check your login status.");
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

    console.log("✅ Available Carriers:\n");
    AVAILABLE_CARRIERS.forEach((carrier, index) => {
      console.log(`  ${index + 1}. ${carrier}`);
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👉 To select a carrier, type:");
    console.log("   selectCarrier(1)  // Replace 1 with your carrier number");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
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
    faceAmounts: [
      26000, 27000, 28000, 29000, 31000, 32000, 33000, 34000, 36000, 37000,
      38000, 39000, 41000, 42000, 43000, 44000, 46000, 47000, 48000, 49000,
    ],
    ages: [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85],
    genders: ["Male", "Female"],
    tobaccos: ["None", "Tobacco"],
    coverageType: "Level", // "Level", "Graded/Modified", or "Guaranteed"
  };

  const total =
    CONFIG.ages.length *
    CONFIG.genders.length *
    CONFIG.tobaccos.length *
    CONFIG.faceAmounts.length;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🎯 Carrier: ${SELECTED_CARRIER}`);
  console.log(`📍 State: ${CONFIG.state}`);
  console.log(`📦 Coverage Type: ${CONFIG.coverageType}`);
  console.log(`📈 Total Requests: ${total.toLocaleString()}`);
  console.log(`⏱️  Estimated Time: ~${Math.ceil((total * 0.3) / 60)} minutes`);
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
                coverageType: CONFIG.coverageType,
                sex,
                state: CONFIG.state,
                age,
                tobacco,
                feet: "",
                inches: "",
                weight: "",
                paymentType: "Bank Draft/EFT",
                underwritingItems: [],
                toolkit: "FEX",
              }),
            });

            // Check for bad request (invalid combination)
            if (!res.ok) {
              if (res.status === 400) {
                // 400 = Invalid combination for this carrier, skip silently
                skippedCombos.push(
                  `${sex}/${tobacco}/age${age}/$${faceAmount.toLocaleString()}`,
                );
                // Don't increment error count for expected 400s
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
                  coverage_type: CONFIG.coverageType,
                  monthly: parseNum(q.monthly),
                  yearly: parseNum(q.yearly),
                  state: CONFIG.state,
                  gender: sex,
                  age: age,
                  term_years: "", // Empty for whole life - import will use null
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

            // Rate limiting: 600ms between requests (more conservative for FEX)
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
    a.download = `fex_${CONFIG.coverageType.toLowerCase()}_${CONFIG.state}_${carrierSafe}.csv`;

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
📊 Final Expense Rate Fetcher - Interactive Mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Fetching sample quote to discover carriers...

✅ Available Carriers:

  1. Americo
  2. Mutual of Omaha
  3. UHL
  4. Sentinel Security
  5. Foresters
  ... (etc)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 To select a carrier, type:
   selectCarrier(1)  // Replace 1 with your carrier number
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then you type in the console:

```javascript
selectCarrier(2); // Picks Mutual of Omaha
```

And it starts fetching!

## Troubleshooting

**Carrier list doesn't appear:**

- Refresh page and try again
- Check you're logged into Insurance Toolkits

**Can't find selectCarrier function:**

- Make sure you pasted the ENTIRE script
- Try typing `window.selectCarrier(1)` instead

**Want to start over with different carrier:**

- Refresh the page
- Paste script again
- Pick new carrier

**Rate limiting errors:**

- Script already uses conservative 300ms delays
- If still issues, increase to 500ms in the code
