# Rate Fetching Scripts - CPT Mode (Cost Per Thousand)

## ⚠️ UPDATED - January 2026

**Key Changes:**
- Ages now 30-85 in 5-year increments (was 18-80 every year)
- Added carrier filtering support
- Improved rate limiting (200ms for term, 300ms for FEX)
- Faster execution (~1 minute for simple CPT vs ~10 minutes previously)

**Recommended Script:**
- **Script 1B** (below) for most users - Simple, fast, with carrier filtering
- **Script 1** (advanced) for users who need interpolation across multiple face amounts

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
// =================== Adaptive Rate Limited Runner ===================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createAdaptiveLimiter({
  initialMinIntervalMs = 450,
  minIntervalFloorMs = 250,
  minIntervalCeilMs = 12000,
  intervalStepUp = 1.8,
  intervalStepDown = 0.96,
  stableWindow = 60,
} = {}) {
  let minIntervalMs = initialMinIntervalMs;
  let lastStart = 0;
  let chain = Promise.resolve();
  let successStreak = 0;

  async function waitTurn() {
    chain = chain.then(async () => {
      const wait = Math.max(0, lastStart + minIntervalMs - Date.now());
      if (wait) await sleep(wait);
      lastStart = Date.now();
    });
    return chain;
  }

  function onSuccess() {
    successStreak++;
    if (successStreak >= stableWindow) {
      minIntervalMs = Math.max(
        minIntervalFloorMs,
        Math.floor(minIntervalMs * intervalStepDown),
      );
      successStreak = 0;
    }
  }

  function onRateLimited() {
    successStreak = 0;
    minIntervalMs = Math.min(
      minIntervalCeilMs,
      Math.ceil(minIntervalMs * intervalStepUp),
    );
  }

  return {
    waitTurn,
    onSuccess,
    onRateLimited,
    getInterval: () => minIntervalMs,
  };
}

async function fetchJsonAdaptive(
  url,
  options,
  limiter,
  {
    maxRetries = 10,
    baseDelayMs = 2000,
    maxDelayMs = 180000, // 3 min
  } = {},
) {
  let attempt = 0;

  while (true) {
    attempt++;
    await limiter.waitTurn();

    let res;
    try {
      res = await fetch(url, options);
    } catch (e) {
      if (attempt > maxRetries) throw e;
      await sleep(Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1)));
      continue;
    }

    if (res.status === 429) {
      limiter.onRateLimited();
      const ra = res.headers.get("Retry-After");
      const retryAfterMs = ra ? Number(ra) * 1000 : 0;
      const backoff = Math.min(
        maxDelayMs,
        Math.max(retryAfterMs, baseDelayMs * Math.pow(2, attempt - 1)),
      );
      await sleep(backoff);
      if (attempt > maxRetries) {
        const text = await res.text().catch(() => "");
        return { ok: false, status: 429, body: text };
      }
      continue;
    }

    if (res.status >= 500) {
      if (attempt > maxRetries) {
        const text = await res.text().catch(() => "");
        return { ok: false, status: res.status, body: text };
      }
      await sleep(Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1)));
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: text };
    }

    limiter.onSuccess();
    const json = await res.json();
    return { ok: true, status: 200, data: json };
  }
}

async function runWorkers(
  jobs,
  workerFn,
  { concurrency = 3, onProgress } = {},
) {
  let idx = 0;
  let done = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const my = idx++;
      if (my >= jobs.length) return;
      await workerFn(jobs[my], my);
      done++;
      if (onProgress) onProgress(done, jobs.length);
    }
  });

  await Promise.all(workers);
}

function downloadCSV(rows, filename) {
  if (!rows.length) return console.warn("No rows:", filename);
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = String(r[h] ?? "");
          return v.includes(",") || v.includes('"') || v.includes("\n")
            ? `"${v.replace(/"/g, '""')}"`
            : v;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// =================== TERM MULTI-FACE (Adaptive + Resume) ===================
const fetchTermRates_MultiFace_ADAPTIVE = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) return console.error("Not logged in!");

  // ---- knobs ----
  const CONCURRENCY = 2; // start low
  const INITIAL_INTERVAL_MS = 500; // start conservative
  const SAVE_EVERY = 20;

  // Set your interpolation points
  const faceAmounts = [50000, 100000, 250000, 500000, 1000000];

  // Resume key should include face amounts so you can run phases safely
  const STORAGE_KEY = `term_multiface_progress_${faceAmounts.join("_")}_v1`;

  const limiter = createAdaptiveLimiter({
    initialMinIntervalMs: INITIAL_INTERVAL_MS,
    minIntervalFloorMs: 300,
    minIntervalCeilMs: 15000,
    stableWindow: 60,
  });

  const genders = ["Male", "Female"];
  const tobaccos = ["None", "Tobacco"];
  const terms = [10, 15, 20, 25, 30]; // numeric
  const ages = Array.from({ length: 63 }, (_, i) => i + 18);

  // Build full job list
  const allJobs = [];
  for (const faceAmount of faceAmounts) {
    for (const sex of genders) {
      for (const tobacco of tobaccos) {
        for (const term of terms) {
          for (const age of ages) {
            allJobs.push({ faceAmount, sex, tobacco, term, age });
          }
        }
      }
    }
  }

  const savedRaw = localStorage.getItem(STORAGE_KEY);
  const saved = savedRaw ? JSON.parse(savedRaw) : null;

  let startIndex = saved?.nextIndex ?? 0;
  let rows = saved?.rows ?? [];
  let failures = saved?.failures ?? [];

  console.log(
    `Jobs total: ${allJobs.length}. Resuming at ${startIndex}. Rows=${rows.length}. Failures=${failures.length}`,
  );

  const jobs = allJobs.slice(startIndex);
  const url = "https://api.insurancetoolkits.com/quoter/";
  const t0 = Date.now();
  let lastLog = 0;

  await runWorkers(
    jobs,
    async (job, i) => {
      const absoluteIndex = startIndex + i;

      const resp = await fetchJsonAdaptive(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            faceAmount: job.faceAmount,
            sex: job.sex,
            term: job.term,
            state: "IL",
            age: job.age,
            tobacco: job.tobacco,
            paymentType: "Bank Draft/EFT",
            underwritingItems: [],
            toolkit: "TERM",
          }),
        },
        limiter,
        { maxRetries: 12, baseDelayMs: 2000 },
      );

      if (!resp.ok) {
        failures.push({
          status: resp.status,
          face_amount: job.faceAmount,
          gender: job.sex,
          tobacco: job.tobacco,
          term_years: job.term,
          age: job.age,
          body: String(resp.body || "").slice(0, 300),
        });

        // If it's a real "block", you'll see many 429s; limiter will slow automatically.
        return;
      }

      const data = resp.data;
      if (data?.quotes?.length) {
        for (const q of data.quotes) {
          rows.push({
            face_amount: job.faceAmount,
            company: q.company,
            plan_name: q.plan_name,
            tier_name: q.tier_name,
            monthly: q.monthly,
            yearly: q.yearly,
            state: "IL",
            gender: job.sex,
            age: job.age,
            term_years: job.term,
            tobacco: job.tobacco,
          });
        }
      }

      if ((absoluteIndex + 1) % SAVE_EVERY === 0) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ nextIndex: absoluteIndex + 1, rows, failures }),
        );
      }
    },
    {
      concurrency: CONCURRENCY,
      onProgress: (done, total) => {
        const now = Date.now();
        if (now - lastLog < 1000) return;
        lastLog = now;

        const elapsedMin = (now - t0) / 60000;
        const perMin = done / Math.max(elapsedMin, 0.0001);
        const etaMin = (total - done) / Math.max(perMin, 0.0001);

        console.log(
          `Progress: ${done}/${total} (${Math.round((done / total) * 100)}%) | ` +
            `${perMin.toFixed(0)} jobs/min | interval=${limiter.getInterval()}ms | ETA~${etaMin.toFixed(1)}m | ` +
            `rows=${rows.length} failures=${failures.length}`,
        );
      },
    },
  );

  localStorage.removeItem(STORAGE_KEY);
  downloadCSV(rows, "term_rates_multiface.csv");
  if (failures.length) downloadCSV(failures, "term_failures.csv");
  window.fetchedRates = rows;
  console.log("Done", { rows: rows.length, failures: failures.length });
  return rows;
};

fetchTermRates_MultiFace_ADAPTIVE();
```

---

## Script 1B: Term Life - Single Face Amount (CPT Only) - UPDATED

Use this for initial import with CPT calculation (single reference face amount).

**Stats:**

- 240 API requests (12 ages × 2 genders × 2 tobacco × 5 terms)
- ~1 minute runtime
- Downloads: `term_rates_all_CPT.csv`
- Supports carrier filtering

```javascript
const fetchAllTermRates = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    console.error("Not logged in!");
    return;
  }

  const CONFIG = {
    faceAmount: 100000, // Single reference face amount
    state: "IL",
    ages: [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85], // Ages 30-85 in 5-year increments
    genders: ["Male", "Female"],
    tobaccos: ["None", "Tobacco"],
    terms: ["10", "15", "20", "25", "30"],
    // CARRIER FILTER: Set to specific carrier name to fetch only that carrier
    // Examples: "Transamerica", "Mutual of Omaha", "Americo", "Lincoln Financial"
    // Set to null to fetch all carriers
    carrierFilter: null, // Change this to filter by carrier
  };

  const quotes = [];
  const total =
    CONFIG.ages.length *
    CONFIG.genders.length *
    CONFIG.tobaccos.length *
    CONFIG.terms.length;
  let current = 0;

  console.log(
    `Fetching ${total} rates at $${CONFIG.faceAmount.toLocaleString()}... ETA ~1 minute`,
  );
  if (CONFIG.carrierFilter) {
    console.log(`Filtering for carrier: ${CONFIG.carrierFilter}`);
  }

  for (const sex of CONFIG.genders) {
    for (const tobacco of CONFIG.tobaccos) {
      for (const term of CONFIG.terms) {
        for (const age of CONFIG.ages) {
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
                  faceAmount: CONFIG.faceAmount,
                  sex,
                  term,
                  state: CONFIG.state,
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
              for (const q of data.quotes) {
                // Filter by carrier if specified
                if (CONFIG.carrierFilter) {
                  if (
                    !q.company
                      .toLowerCase()
                      .includes(CONFIG.carrierFilter.toLowerCase())
                  ) {
                    continue; // Skip this quote
                  }
                }

                quotes.push({
                  face_amount: CONFIG.faceAmount,
                  company: q.company,
                  plan_name: q.plan_name,
                  tier_name: q.tier_name,
                  monthly: q.monthly,
                  yearly: q.yearly,
                  state: CONFIG.state,
                  gender: sex,
                  age,
                  term_years: term,
                  tobacco,
                });
              }
            }
          } catch (e) {
            console.error(`Error: ${sex}/${tobacco}/${term}yr/age${age}`);
          }

          if (current % 20 === 0)
            console.log(
              `Progress: ${current}/${total} (${Math.round((current / total) * 100)}%) - ${quotes.length} quotes collected`,
            );

          // Rate limiting: 200ms between requests
          await new Promise((r) => setTimeout(r, 200));
        }
        console.log(
          `✓ ${sex} ${tobacco} ${term}yr - ${quotes.length} quotes so far`,
        );
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  console.log(`\n✅ Done! ${quotes.length} rates fetched`);

  // Auto-download CSV
  if (quotes.length > 0) {
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
    const carrierSuffix = CONFIG.carrierFilter
      ? `_${CONFIG.carrierFilter.replace(/\s+/g, "_")}`
      : "";
    a.download = `term_rates_all_CPT${carrierSuffix}.csv`;
    a.click();

    window.fetchedRates = quotes;
    console.log("📁 CSV downloaded: " + a.download);
  } else {
    console.warn("No quotes to download!");
  }

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
/**
 * FEX ONLY — InsuranceToolkits Quoter Bulk Fetcher (multi-face)
 * Improvements vs your script:
 * - Controlled concurrency worker pool (faster than fully sequential)
 * - Global adaptive rate limiter (self-throttles on 429)
 * - Honors Retry-After + exponential backoff
 * - Skips non-retryable 4xx (captures body) instead of crashing
 * - Resume via localStorage checkpoint
 * - Downloads CSV for rows + failures
 *
 * Paste into DevTools Console on https://app.insurancetoolkits.com
 * Then run fetchFEXRatesMultiFace()
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createAdaptiveLimiter({
  initialMinIntervalMs = 750,
  minIntervalFloorMs = 300,
  minIntervalCeilMs = 25000,
  intervalStepUp = 2.0,
  intervalStepDown = 0.965,
  stableWindow = 70,
} = {}) {
  let minIntervalMs = initialMinIntervalMs;
  let lastStart = 0;
  let chain = Promise.resolve();
  let successStreak = 0;

  async function waitTurn() {
    chain = chain.then(async () => {
      const now = Date.now();
      const wait = Math.max(0, lastStart + minIntervalMs - now);
      if (wait) await sleep(wait);
      lastStart = Date.now();
    });
    return chain;
  }

  function onSuccess() {
    successStreak++;
    if (successStreak >= stableWindow) {
      minIntervalMs = Math.max(
        minIntervalFloorMs,
        Math.floor(minIntervalMs * intervalStepDown),
      );
      successStreak = 0;
    }
  }

  function onRateLimited() {
    successStreak = 0;
    minIntervalMs = Math.min(
      minIntervalCeilMs,
      Math.ceil(minIntervalMs * intervalStepUp),
    );
  }

  return {
    waitTurn,
    onSuccess,
    onRateLimited,
    getInterval: () => minIntervalMs,
  };
}

async function fetchJsonAdaptive(
  url,
  options,
  limiter,
  {
    maxRetries = 12,
    baseDelayMs = 3000,
    maxDelayMs = 240000, // 4 min
  } = {},
) {
  let attempt = 0;

  while (true) {
    attempt++;
    await limiter.waitTurn();

    let res;
    try {
      res = await fetch(url, options);
    } catch (e) {
      if (attempt > maxRetries) throw e;
      const backoff = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(2, attempt - 1),
      );
      await sleep(backoff);
      continue;
    }

    if (res.status === 429) {
      limiter.onRateLimited();

      const ra = res.headers.get("Retry-After");
      const retryAfterMs = ra ? Number(ra) * 1000 : 0;

      const backoff = Math.min(
        maxDelayMs,
        Math.max(retryAfterMs, baseDelayMs * Math.pow(2, attempt - 1)),
      );

      await sleep(backoff);

      if (attempt > maxRetries) {
        const text = await res.text().catch(() => "");
        return { ok: false, status: 429, body: text };
      }
      continue;
    }

    if (res.status >= 500) {
      if (attempt > maxRetries) {
        const text = await res.text().catch(() => "");
        return { ok: false, status: res.status, body: text };
      }
      const backoff = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(2, attempt - 1),
      );
      await sleep(backoff);
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: text };
    }

    limiter.onSuccess();
    const json = await res.json();
    return { ok: true, status: 200, data: json };
  }
}

async function runWorkers(
  jobs,
  workerFn,
  { concurrency = 2, onProgress } = {},
) {
  let idx = 0;
  let done = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const my = idx++;
      if (my >= jobs.length) return;
      await workerFn(jobs[my], my);
      done++;
      if (onProgress) onProgress(done, jobs.length);
    }
  });

  await Promise.all(workers);
}

function downloadCSV(rows, filename) {
  if (!rows.length) {
    console.warn("No rows to download:", filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = String(r[h] ?? "");
          return v.includes(",") || v.includes('"') || v.includes("\n")
            ? `"${v.replace(/"/g, '""')}"`
            : v;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/**
 * FEX multi-face fetcher
 * Customize defaults here or pass overrides in call.
 */
async function fetchFEXRatesMultiFace({
  state = "IL",
  faceAmounts = [5000, 10000, 25000, 40000, 50000],
  genders = ["Male", "Female"],
  tobaccos = ["None", "Tobacco"],
  coverageTypes = ["Level", "Graded/Modified", "Guaranteed"],
  ages = Array.from({ length: 66 }, (_, i) => i + 20), // 20..85
  paymentType = "Bank Draft/EFT",
  underwritingItems = [],
  feet = "",
  inches = "",
  weight = "",
  concurrency = 2, // start low; FEX tends to trip limits easier
  initialIntervalMs = 800, // start conservative
  saveEvery = 20,
  maxRetries = 12,
  baseDelayMs = 3000,
  storageKey = `FEX_${state}_${faceAmounts.join("-")}_${coverageTypes.join("|")}_v1`,
  outRowsCsv = `fex_rates_${state}_${faceAmounts.join("-")}.csv`,
  outFailuresCsv = `fex_failures_${state}_${faceAmounts.join("-")}.csv`,
} = {}) {
  const token = localStorage.getItem("accessToken");
  if (!token) return console.error("Not logged in (missing accessToken).");

  const limiter = createAdaptiveLimiter({
    initialMinIntervalMs: initialIntervalMs,
  });
  const url = "https://api.insurancetoolkits.com/quoter/";

  // Build jobs (faceAmount is part of job)
  const allJobs = [];
  for (const faceAmount of faceAmounts) {
    for (const sex of genders) {
      for (const tobacco of tobaccos) {
        for (const coverageType of coverageTypes) {
          for (const age of ages) {
            allJobs.push({ faceAmount, sex, tobacco, coverageType, age });
          }
        }
      }
    }
  }

  // Resume
  const savedRaw = localStorage.getItem(storageKey);
  const saved = savedRaw ? JSON.parse(savedRaw) : null;

  let startIndex = saved?.nextIndex ?? 0;
  let rows = saved?.rows ?? [];
  let failures = saved?.failures ?? [];

  console.log(
    `FEX multi-face: jobs=${allJobs.length} resume=${startIndex} rows=${rows.length} failures=${failures.length}`,
  );

  const jobs = allJobs.slice(startIndex);
  const t0 = Date.now();
  let lastLog = 0;

  const parseNum = (s) => {
    if (s == null) return 0;
    const n = parseFloat(String(s).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  await runWorkers(
    jobs,
    async (job, i) => {
      const absoluteIndex = startIndex + i;

      const resp = await fetchJsonAdaptive(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            faceAmount: job.faceAmount,
            coverageType: job.coverageType,
            sex: job.sex,
            state,
            age: job.age,
            tobacco: job.tobacco,
            feet,
            inches,
            weight,
            paymentType,
            underwritingItems,
            toolkit: "FEX",
          }),
        },
        limiter,
        { maxRetries, baseDelayMs },
      );

      if (!resp.ok) {
        failures.push({
          status: resp.status,
          face_amount: job.faceAmount,
          state,
          gender: job.sex,
          age: job.age,
          tobacco: job.tobacco,
          coverage_type: job.coverageType,
          body: String(resp.body || "").slice(0, 300),
        });

        // Uncomment to inspect 400s:
        // if (resp.status === 400) console.warn("400 job:", job, "body:", String(resp.body || "").slice(0, 300));
      } else {
        const data = resp.data;

        if (data?.quotes?.length) {
          for (const q of data.quotes) {
            rows.push({
              face_amount: job.faceAmount,
              company: q.company,
              plan_name: q.plan_name,
              tier_name: q.tier_name,
              monthly: parseNum(q.monthly),
              yearly: parseNum(q.yearly),
              state,
              gender: job.sex,
              age: job.age,
              tobacco: job.tobacco,
              coverage_type: job.coverageType,
            });
          }
        }
      }

      // checkpoint
      if ((absoluteIndex + 1) % saveEvery === 0) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ nextIndex: absoluteIndex + 1, rows, failures }),
        );
      }
    },
    {
      concurrency,
      onProgress: (done, total) => {
        const now = Date.now();
        if (now - lastLog < 1000) return;
        lastLog = now;

        const elapsedMin = (now - t0) / 60000;
        const perMin = done / Math.max(elapsedMin, 0.0001);
        const etaMin = (total - done) / Math.max(perMin, 0.0001);

        console.log(
          `Progress: ${done}/${total} (${Math.round((done / total) * 100)}%) | ` +
            `${perMin.toFixed(0)} jobs/min | interval=${limiter.getInterval()}ms | ETA~${etaMin.toFixed(1)}m | ` +
            `rows=${rows.length} failures=${failures.length}`,
        );
      },
    },
  );

  localStorage.removeItem(storageKey);

  downloadCSV(rows, outRowsCsv);
  if (failures.length) downloadCSV(failures, outFailuresCsv);

  window.fetchedRates = rows;
  window.fetchFailures = failures;

  console.log("Done.", { rows: rows.length, failures: failures.length });
  return { rows, failures };
}

// RUN DEFAULTS:
fetchFEXRatesMultiFace();

// If you get blocked, slow it down:
// fetchFEXRatesMultiFace({ concurrency: 1, initialIntervalMs: 1200 });
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
