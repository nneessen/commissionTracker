# CRITICAL MIGRATION AND FILE NAMING RULES

## Migration Files - NON-NEGOTIABLE RULES

### Location
- **ONLY ONE LOCATION**: `supabase/migrations/`
- ❌ **NEVER** create migration files in project root
- ❌ **NEVER** create migration files anywhere else
- ❌ **NEVER** create "helper" migration files like `APPLY_THIS_MIGRATION.sql` in root

### Naming Convention
- **FORMAT**: `YYYYMMDD_NNN_descriptive_name.sql`
- **EXAMPLE**: `20251007_001_add_expense_type_and_name.sql`
- ❌ **NEVER** use simple numbers like `001_initial.sql`
- ❌ **NEVER** create duplicate sequence numbers
- ❌ **NEVER** use extensions like `.OLD`, `.backup`, `.temp`

### Migration Workflow
1. Check existing migrations: `ls supabase/migrations/`
2. Create new migration: `supabase migration new descriptive_name`
3. Write SQL in generated file
4. Test locally: `supabase db reset`
5. Commit to git
6. Apply to production via Supabase dashboard or CLI

### Common Mistakes to AVOID
- ❌ Creating migration files manually in root directory
- ❌ Using non-timestamped naming (001, 002, etc.)
- ❌ Duplicate sequence numbers
- ❌ Multiple migration directories
- ❌ Helper SQL files in project root

## Plan Files

### Location
- **Active plans**: `plans/ACTIVE/`
- **Completed plans**: `plans/COMPLETED/`
- **Archived plans**: `plans/ARCHIVED/`

### Naming Convention
- **Active**: `YYYYMMDD_ACTIVE_descriptive_name.md`
- **Completed**: `YYYYMMDD_COMPLETED_descriptive_name.md`
- **Archived**: `YYYYMMDD_ARCHIVED_descriptive_name.md`

### Workflow
1. Create in `plans/ACTIVE/` with `ACTIVE` in filename
2. Update as work progresses
3. When complete, rename to `COMPLETED` and move to `plans/COMPLETED/`
4. When superseded, rename to `ARCHIVED` and move to `plans/ARCHIVED/`

## User's Frustration History

The user has been "extremely disappointed" and "frustrated" multiple times about:
1. Not following migration file naming conventions
2. Creating migration files in wrong locations (project root)
3. Creating duplicate sequence numbers (multiple 001, 002, etc.)
4. Not pulling DB schema before writing migrations
5. Making assumptions instead of checking actual data

**CONSEQUENCE**: User pays $200/mo and expects these basic rules to be followed WITHOUT EXCEPTION.

## Action Required Before ANY Migration Work

1. **ALWAYS** pull current schema: Check actual DB state
2. **ALWAYS** check existing migrations: `ls supabase/migrations/`
3. **ALWAYS** use proper naming: `YYYYMMDD_NNN_description.sql`
4. **ALWAYS** create in correct location: `supabase/migrations/`
5. **NEVER** create helper SQL files in project root
6. **NEVER** assume schema - verify actual columns/types

## Remember

The user has explicitly stated frustration about these mistakes multiple times. Following these rules is NOT OPTIONAL.
