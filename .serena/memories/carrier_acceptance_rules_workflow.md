# Carrier Acceptance Rules Workflow

## Dual System Requirement
When seeding acceptance rules for a carrier/product, MUST populate BOTH:
1. **V1: `carrier_condition_acceptance`** — flat lookup table used by quoting engine `lookupAcceptance()`
2. **V2: `underwriting_rule_sets` + `underwriting_rules`** — structured rule engine for Coverage Builder UI

## Key Schema Details

### V1: carrier_condition_acceptance
- `condition_code` is TEXT but has FK to `underwriting_health_conditions` table
- New condition codes must be added to `underwriting_health_conditions` first
- Unique constraint: `(carrier_id, condition_code, product_type, imo_id)`
- `acceptance` values: `approved`, `declined`, `case_by_case`, `table_rated`
- Use `imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'` for wildcard

### V2: underwriting_rule_sets + underwriting_rules
- `scope` = `'condition'::rule_set_scope`
- `review_status` = `'approved'::rule_review_status`
- `source_type` = `'manual'::rule_source_type`
- `health_class` enum values: preferred_plus, preferred, standard_plus, standard, substandard, graded, modified, guaranteed_issue, refer, decline, unknown
- `outcome_eligibility` values: eligible, ineligible, refer
- Predicate version 2 format with `condition_presence` type

## Product Type Mapping
- Term products → binary Standard/Decline → `approved`/`declined`
- Whole Life (final expense) → 4-tier: No Coverage/Return of Premium/Graded/Immediate
  - No Coverage → v1: `declined`, v2: `ineligible`/`decline`
  - Return of Premium → v1: `case_by_case`, v2: `eligible`/`modified`
  - Graded → v1: `case_by_case`, v2: `eligible`/`graded`
  - Immediate → v1: `approved`, v2: `eligible`/`standard`
- UL products → similar to Term, binary Standard/Decline

## Migration Template Pattern
Use temp table + batch INSERT approach (see SBLI template):
1. Declare carrier/product IDs as variables
2. Create temp table ON COMMIT DROP
3. Batch insert all conditions into temp table
4. INSERT INTO rule_sets/rules FROM temp table with NOT EXISTS guard
5. Use ON CONFLICT DO UPDATE for v1 (idempotent)

## Common Pitfall
`condition_code` column in `carrier_condition_acceptance` has a FK to `underwriting_health_conditions.code`.
New codes (e.g., `myasthenia_gravis`, `pulmonary_hypertension`) must be inserted into that lookup table BEFORE referencing them.
