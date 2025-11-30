# Reset Recruit Progress Script

## Purpose
Resets ALL recruits back to the initial phase (Phone Interview) and clears all checklist completion progress. Useful for testing the recruiting pipeline flow.

## Location
- **Shell Script**: `scripts/reset-recruit-progress.sh` (interactive with confirmation)
- **SQL Script**: `scripts/reset-recruit-progress.sql` (raw SQL)

## Usage

### Quick Run (Interactive)
```bash
./scripts/reset-recruit-progress.sh
```
This will:
1. Show current state of all recruits
2. Ask for confirmation (type "yes")
3. Execute the reset
4. Show the state after reset

### Direct SQL Execution
```bash
PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -f scripts/reset-recruit-progress.sql
```

## What It Resets

1. **`recruit_phase_progress`**:
   - First phase (Phone Interview) → `in_progress`
   - All other phases → `not_started`
   - Clears: `completed_at`, `blocked_reason`, `notes`

2. **`recruit_checklist_progress`**:
   - All items → `not_started`
   - Clears: `completed_at`, `completed_by`, `verified_at`, `verified_by`, `rejection_reason`, `document_id`, `notes`, `metadata`

3. **`user_profiles`** (for recruits only):
   - `onboarding_status` → `interview_1`
   - `current_onboarding_phase` → `Phone Interview`
   - `onboarding_completed_at` → NULL

## Warning
This is DESTRUCTIVE and cannot be undone. All recruit progress will be lost.

## Created
2025-11-29
