# Scripts Directory Cleanup Plan

## Problem
60+ scripts in a flat `scripts/` directory with no organization. Mix of:
- Essential recurring scripts
- One-time fix scripts that have served their purpose
- Obsolete debugging/test scripts
- Documentation files that don't belong in scripts/

## Proposed Folder Structure

```
scripts/
├── migrations/           # Database migration utilities
│   ├── apply-migration.sh
│   ├── run-migration.sh
│   └── run-migration-direct.cjs
├── testing/              # Recurring test/validation scripts
│   ├── test-app-runs.sh
│   ├── test-build.sh
│   └── test-typecheck.sh
├── utilities/            # General-purpose utilities
│   ├── get-schema.sh
│   ├── execute-sql.cjs
│   └── verify-migrations.sh
└── archive/              # One-off scripts (kept for reference, not in git)
    └── ... (obsolete scripts moved here then deleted)
```

## Scripts to KEEP (organized into folders)

### migrations/
| Script | Purpose |
|--------|---------|
| `apply-migration.sh` | **ONLY** migration script - applies SQL to remote DB |

### testing/
| Script | Purpose |
|--------|---------|
| `test-app-runs.sh` | Verify app starts without errors |
| `test-build.sh` | Comprehensive build validation |
| `test-typecheck.sh` | TypeScript compilation check |

### utilities/
| Script | Purpose |
|--------|---------|
| `get-schema.sh` | Fetch current DB schema |
| `execute-sql.cjs` | Run arbitrary SQL |
| `verify-migrations.sh` | Verify migration status |

**Note**: `run-migration.sh` is nearly identical to apply-migration.sh (redundant).
`run-migration-direct.cjs` is hardcoded to ONE specific migration (one-off).

## Scripts to DELETE (obsolete one-offs)

### Redundant Migration Scripts
- `run-migration.sh` (identical to apply-migration.sh, just prompts for password)
- `run-migration-direct.cjs` (hardcoded to one specific migration file)
- `migrate.sh` (likely obsolete)

### One-Time Fix Scripts (work is done)
- `fix-component-imports.sh`
- `fix-rls-policies.sql` / `FIX_RLS_POLICIES.sql`
- `fix-commission-data-NOW.cjs`
- `fix-commissions-simple.ts`
- `fix-simple-term.js`
- `fix-admin-account.ts`
- `fix-remote-database.sh`
- `fix-problem-users-data.sql`
- `apply-commission-fix.js`
- `apply-corrected-ffg-data.js`
- `apply-ffg-correct-carriers.js`

### Emergency Scripts (no longer needed)
- `EMERGENCY_FIX_RUN_IN_SUPABASE.sql`
- `COMPLETE_DATABASE_RESET.sql`

### One-Time Data Import Scripts
- `populate-database.js`
- `populate-comp-guide.js`
- `import-comp-guide-data.js`
- `importCommissionData.js`
- `migrate-comp-guide-data.js`
- `generate-comp-guide-migration.js`
- `backfill-commissions.ts`
- `parse-ffg-data.ts`

### One-Time Debug/Test Scripts
- `test-rls-fix.sh` / `test-rls-fix.cjs`
- `test-admin-access.ts`
- `test-commission-function.sql`
- `test-commission-rates.ts`
- `test-commission-accuracy.ts`
- `test-fixed-calculation.ts`
- `test-dashboard-calculation.ts`
- `verify-dashboard-calculations.ts`
- `test-date-ranges.js`
- `test-policy-creation.sh`
- `test-db-functions.sql`
- `test-reports-generation.sh`
- `test-permission-guard.sh`
- `test-recruiting.sh`
- `check-invitation.mjs`
- `test-invitation-system.mjs`
- `apply-invitation-migrations.sh`
- `benchmark-userService.ts`
- `verify-expense-data.ts`
- `check-db-health.ts`

### SQL Scripts (already applied or obsolete)
- `FIX_COMP_GUIDE_DATA.sql`
- `CHECK_COMMISSION_DISCREPANCY.sql`
- `CHECK_COMP_GUIDE_DATA.sql`
- `UPDATE_DATA_TO_2025.sql`

### Documentation (move to docs/)
- `refactor-inline-styles-guide.md` → `docs/guides/`
- `test-user-management-in-browser.md` → `docs/guides/`
- `CLAUDE.md` → DELETE (has obsolete questions, info exists in memories)

## User Decisions
- **Cleanup level**: Delete everything obsolete (no archive)
- **Reorganize**: Yes - create subfolders

## Implementation Steps

1. Create folder structure:
   ```bash
   mkdir -p scripts/migrations scripts/testing scripts/utilities
   ```

2. Move essential scripts (7 total):
   ```bash
   # migrations/ (1 file)
   mv scripts/apply-migration.sh scripts/migrations/

   # testing/ (3 files)
   mv scripts/test-app-runs.sh scripts/testing/
   mv scripts/test-build.sh scripts/testing/
   mv scripts/test-typecheck.sh scripts/testing/

   # utilities/ (3 files)
   mv scripts/get-schema.sh scripts/utilities/
   mv scripts/execute-sql.cjs scripts/utilities/
   mv scripts/verify-migrations.sh scripts/utilities/
   ```

3. Delete all obsolete scripts (50+ files)

4. Move docs to proper location:
   ```bash
   mv scripts/refactor-inline-styles-guide.md docs/guides/
   mv scripts/test-user-management-in-browser.md docs/guides/
   rm scripts/CLAUDE.md  # Info exists in memories
   ```

5. Update memories with new paths:
   - `working-migration-script-UPDATED` → `scripts/migrations/apply-migration.sh`
   - `supabase_migration_workflow` → `scripts/migrations/apply-migration.sh` (fix reference to deleted run-migration.sh)
   - `testing-scripts` → `scripts/testing/`

## Final Structure
```
scripts/
├── migrations/
│   └── apply-migration.sh      # ONLY migration tool
├── testing/
│   ├── test-app-runs.sh        # App health check
│   ├── test-build.sh           # Build validation
│   └── test-typecheck.sh       # TS compilation
└── utilities/
    ├── get-schema.sh           # Fetch DB schema
    ├── execute-sql.cjs         # Run arbitrary SQL
    └── verify-migrations.sh    # Migration status
```

**Result**: 60+ files → 7 organized scripts in 3 folders
