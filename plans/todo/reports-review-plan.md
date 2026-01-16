# Reports Services Deep Dive Review (Post-Security-Fix)

## Security Fix Applied (2026-01-16)

**Migration Created:** `supabase/migrations/20260116_001_secure_report_mvs.sql`

This migration addresses the cross-tenant exposure risk by:
1. **Revoking direct SELECT** on all `mv_*` and `commission_chargeback_summary` from `anon` and `authenticated` roles
2. **Creating SECURITY DEFINER RPCs** that enforce `user_id = auth.uid()` server-side:
   - `get_user_carrier_performance()`
   - `get_user_client_ltv()`
   - `get_user_cohort_retention()`
   - `get_user_commission_aging()`
   - `get_user_daily_production(DATE, DATE)`
   - `get_user_expense_summary()`
   - `get_user_product_performance()`
   - `get_user_production_velocity(INT)`
   - `get_user_commission_chargeback_summary()`
3. **Granting EXECUTE** only to `authenticated` role

**Services Updated:**
- `src/services/reports/reportGenerationService.ts` - All MV fetch methods now use secure RPCs
- `src/services/reports/drillDownService.ts` - `getClientsByTier` now uses `get_user_client_ltv()` RPC

---

### 1. High-Risk Issues (Blocking)

- ~~RLS is disabled for all report MVs (`relrowsecurity = false`) and there are no `pg_policies` entries for them~~ **RESOLVED** - Migration `20260116_001_secure_report_mvs.sql` revokes direct access and exposes MVs only via SECURITY DEFINER RPCs that enforce `auth.uid()`.
- ~~`commission_chargeback_summary` is a view with no RLS~~ **RESOLVED** - Now accessed only via `get_user_commission_chargeback_summary()` RPC.
- `getuser_commission_profile` is `SECURITY DEFINER`; the correctness of `is_super_admin()`/`is_imo_admin()` must be verified to avoid privilege escalation in `supabase/migrations/20260110_011_fix_commission_rate_from_policies.sql:24`. **STILL NEEDS REVIEW**

### 2. Medium-Risk Issues (Should Fix)

- Date filtering uses `.toISOString()` for DATE columns and JS `Date` comparisons, which can shift boundaries due to timezone; use date-only helpers (`formatDateForDB`/`parseLocalDate`) for `expenses.date`, `policies.effective_date`, and insight ranges in `src/services/reports/reportGenerationService.ts:869`, `src/services/reports/reportGenerationService.ts:880`, `src/services/reports/insightsService.ts:79`.
- `fetchCommissionData` and `fetchCarrierPerformance` pull full datasets and filter in JS, defeating indexes and risking memory/perf blowups as data grows; server-side date predicates should be used instead in `src/services/reports/reportGenerationService.ts:846`, `src/services/reports/reportGenerationService.ts:903`.
- Report filters beyond dates (`carrierIds`, `productIds`, `states`, `clientIds`) are ignored, and MV-backed sections are not date-scoped, so reports do not reflect user-selected filters or time ranges in `src/types/reports.types.ts:24`, `src/services/reports/reportGenerationService.ts:840`, `src/services/reports/reportGenerationService.ts:1000`.
- Chargeback insights filter by `payment_date` instead of `chargeback_date`, and lapse insights filter by `effective_date` instead of a lapse/cancellation date, producing misleading insights in `src/services/reports/insightsService.ts:74`, `src/services/reports/insightsService.ts:122`.
- Many Supabase reads ignore `error` and silently return empty data, masking RLS or network failures and producing incorrect reports without surfacing errors in `src/services/reports/reportGenerationService.ts:846`, `src/services/reports/reportGenerationService.ts:869`, `src/services/reports/insightsService.ts:74`.
- Export paths interpolate unescaped data into HTML/CSV, enabling XSS in print windows and CSV formula injection when opened in Excel in `src/services/reports/reportExportService.ts:42`, `src/services/reports/reportBundleService.ts:124`, `src/utils/exportHelpers.ts:22`.
- Carrier performance is derived only from paid commissions; policies with no paid commission are excluded, so persistency and policy counts can be materially understated in `src/services/reports/reportGenerationService.ts:903`.

### 3. Low-Risk / Quality Improvements

- Dead or unused values add noise: `_expenseSummary`, `_highRisk` in `src/services/reports/reportGenerationService.ts:680`, `src/services/reports/reportGenerationService.ts:214`.
- Forecast volatility warning can divide by zero when `priorAvg` is 0, creating `Infinity/NaN` changes in `src/services/reports/forecastingService.ts:272`.
- Table-of-contents page numbers are hard-coded and may mislead in `src/services/reports/reportBundleService.ts:218`.

### 4. Security & RLS Analysis

- ~~`pg_policies` returned no policies for any `mv_*` or `commission_chargeback_summary`~~ **RESOLVED** - Direct access revoked; RPCs enforce `auth.uid()`.
- ~~Client-provided `userId` filters are not a security boundary~~ **RESOLVED** - Services now use RPCs that ignore client-provided userId; tenant isolation enforced server-side.
- `getuser_commission_profile` SECURITY DEFINER function needs review to verify `is_super_admin()`/`is_imo_admin()` are correctly implemented.

### 5. Data Integrity & Migration Review

- ~~Definitions for `commission_chargeback_summary` and all `mv_*` objects are missing from `supabase/migrations`~~ **PARTIALLY RESOLVED** - Access control is now versioned via `20260116_001_secure_report_mvs.sql`. The original MV definitions should still be captured in migrations for completeness, but security is now enforced.
- The MV definitions show all-time aggregates (no date filtering); report logic mixes all-time MV data with date-scoped raw data, so outputs are time-inconsistent in `src/services/reports/reportGenerationService.ts:1000`.

### 6. React Query & Frontend Data Flow

- `useReport` omits `carrierIds`, `productIds`, `states`, and `clientIds` from the query key, so cache entries can be reused across incompatible filters in `src/hooks/reports/useReport.ts:20`.
- The report generator ignores those filters entirely, so UI filter state does not align with the data returned in `src/types/reports.types.ts:24`, `src/services/reports/reportGenerationService.ts:840`.

### 7. Test Coverage Gaps

- No unit tests for report calculations and formatting (retention, persistency, expense ratio, confidence) in `src/services/reports/reportGenerationService.ts:114`.
- No tests validating insight logic with correct date fields or edge cases (chargebacks, lapses, zero data) in `src/services/reports/insightsService.ts:71`.
- ~~No integration/RLS tests proving cross-tenant isolation~~ **CAN NOW BE WRITTEN** - With RPCs in place, integration tests can verify that users only see their own data.
- No tests for report filter behavior (carrier/product/client/state) or React Query cache-key correctness in `src/hooks/reports/useReport.ts:20`.

### 8. Final Verdict

**Conditionally Approved** - The blocking cross-tenant security risk has been resolved with the RPC migration.

**Required before production:**
1. Apply migration `20260116_001_secure_report_mvs.sql` to production
2. Regenerate `database.types.ts` after migration is applied
3. Verify `getuser_commission_profile` SECURITY DEFINER function has correct privilege checks

**Recommended follow-ups:**
- Write integration tests for RPC tenant isolation
- Fix date filtering to use date-only helpers (Medium risk)
- Add server-side filters for carrier/product/state/client
- Escape export data to prevent XSS/CSV injection
