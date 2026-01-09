# Decision Tree Enhancement Plan

## Session Context
Date: 2026-01-09
Branch: feature/underwriting-wizard

## Critical Bug - MUST FIX FIRST

### Issue: Page freezes when clicking "+ Add Rule" after first rule
**Location:** `src/features/underwriting/components/DecisionTreeEditor/`
**Symptoms:** After adding one rule, clicking "+ Add Rule" again causes page freeze
**Likely Cause:** Infinite loop or excessive re-renders in state management

**Debug Steps:**
1. Check `RuleBuilder.tsx` for state update loops
2. Check if `useEffect` has missing dependencies causing re-render cycles
3. Check if rule ID generation is causing duplicate keys
4. Check memoization of expensive computations

---

## Enhancement Plan: Comprehensive Decision Tree Rules

### Current State
The decision tree currently supports basic conditions:
- Age ranges
- Gender
- State
- BMI ranges
- Product type matching

### Proposed Enhancements

#### Phase 1: Health Condition Rules
Add ability to create rules based on health conditions:

**New Condition Types:**
- `has_condition` - Client has specific condition (diabetes, heart disease, etc.)
- `condition_severity` - Mild/Moderate/Severe
- `condition_controlled` - Is condition well-controlled
- `condition_duration` - Years since diagnosis
- `multiple_conditions` - Count of conditions >= X

**Example Rule:**
```
IF has_condition = "diabetes" AND condition_controlled = true
THEN recommend "Preferred" rating for [Carrier X]
```

#### Phase 2: Medication Rules
**New Condition Types:**
- `medication_count` - Total medications
- `bp_medication_count` - Blood pressure meds
- `cholesterol_medication_count` - Cholesterol meds
- `takes_medication` - Specific medication name/class
- `insulin_dependent` - Boolean for diabetics

**Example Rule:**
```
IF bp_medication_count <= 2 AND cholesterol_medication_count <= 1
THEN eligible for "Standard Plus"
```

#### Phase 3: Tobacco/Lifestyle Rules
**New Condition Types:**
- `tobacco_status` - Never/Former/Current
- `tobacco_type` - Cigarettes/Cigars/Chew/Vape
- `tobacco_quit_years` - Years since quit
- `tobacco_frequency` - Daily/Occasional
- `alcohol_use` - None/Social/Heavy
- `hazardous_occupation` - Boolean
- `hazardous_hobbies` - Skydiving, racing, etc.

**Example Rule:**
```
IF tobacco_status = "former" AND tobacco_quit_years >= 5
THEN eligible for "Non-Tobacco" rates
```

#### Phase 4: Coverage-Based Rules
**New Condition Types:**
- `face_amount_range` - $0-50k, $50k-100k, etc.
- `face_amount_exceeds` - Face amount > X
- `product_type` - Term/Whole/UL/Final Expense
- `term_length` - 10/15/20/30 year term

**Example Rule:**
```
IF face_amount_exceeds = 250000 AND age > 60
THEN require "Medical Exam"
```

#### Phase 5: Combination Rules (Advanced)
**New Features:**
- `AND` / `OR` / `NOT` logic groups
- Nested condition groups
- Rule priority/ordering
- Rule inheritance (base rules + overrides)

**Example Complex Rule:**
```
IF (age >= 50 AND age <= 65)
   AND (has_condition = "diabetes" OR has_condition = "hypertension")
   AND condition_controlled = true
   AND bp_medication_count <= 2
THEN recommend "Table 2-4" rating
ELSE IF NOT condition_controlled
THEN recommend "Decline"
```

### Database Schema Changes

```sql
-- New table for condition types
CREATE TABLE decision_rule_condition_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'demographic', 'health', 'medication', 'tobacco', 'coverage'
  data_type TEXT NOT NULL, -- 'boolean', 'number', 'string', 'enum', 'range'
  enum_values TEXT[], -- For enum types
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Seed with condition types
INSERT INTO decision_rule_condition_types (code, name, category, data_type, enum_values) VALUES
('age', 'Age', 'demographic', 'number', NULL),
('gender', 'Gender', 'demographic', 'enum', ARRAY['male', 'female']),
('state', 'State', 'demographic', 'string', NULL),
('bmi', 'BMI', 'demographic', 'number', NULL),
('has_condition', 'Has Health Condition', 'health', 'enum', NULL), -- Dynamic from health_conditions table
('condition_controlled', 'Condition Controlled', 'health', 'boolean', NULL),
('bp_med_count', 'BP Medication Count', 'medication', 'number', NULL),
('cholesterol_med_count', 'Cholesterol Med Count', 'medication', 'number', NULL),
('tobacco_status', 'Tobacco Status', 'tobacco', 'enum', ARRAY['never', 'former', 'current']),
('tobacco_quit_years', 'Years Since Quit', 'tobacco', 'number', NULL),
('face_amount', 'Face Amount', 'coverage', 'number', NULL),
('product_type', 'Product Type', 'coverage', 'enum', ARRAY['term', 'whole_life', 'universal_life', 'final_expense']);
```

### UI Enhancements

1. **Condition Category Tabs**
   - Demographic | Health | Medications | Tobacco | Coverage

2. **Visual Rule Builder**
   - Drag-and-drop conditions
   - Visual AND/OR grouping
   - Color-coded by category

3. **Rule Templates**
   - Pre-built common rules
   - "Preferred Plus Eligible" template
   - "Tobacco Class" template
   - "Decline Criteria" template

4. **Rule Testing**
   - Input test client profile
   - See which rules match
   - Debug rule conflicts

5. **Rule Import/Export**
   - JSON export for backup
   - Import carrier-specific rule sets
   - Share rules between IMOs

### Implementation Priority

1. **Immediate (Bug Fix):** Fix "+ Add Rule" freeze
2. **Week 1:** Add health condition rules (Phase 1)
3. **Week 2:** Add medication rules (Phase 2)
4. **Week 3:** Add tobacco/lifestyle rules (Phase 3)
5. **Week 4:** Add coverage-based rules (Phase 4)
6. **Future:** Advanced combination rules (Phase 5)

### Files to Modify/Create

**Bug Fix:**
- `src/features/underwriting/components/DecisionTreeEditor/RuleBuilder.tsx`
- `src/features/underwriting/components/DecisionTreeEditor/RuleConditionRow.tsx`

**New Files:**
- `supabase/migrations/20260110_001_decision_rule_condition_types.sql`
- `src/features/underwriting/components/DecisionTreeEditor/ConditionCategoryTabs.tsx`
- `src/features/underwriting/components/DecisionTreeEditor/RuleTemplates.tsx`
- `src/features/underwriting/components/DecisionTreeEditor/RuleTestPanel.tsx`
- `src/features/underwriting/hooks/useConditionTypes.ts`
- `src/features/underwriting/types/ruleConditions.types.ts`

**Modify:**
- `src/features/underwriting/components/DecisionTreeEditor/DecisionTreeEditor.tsx`
- `src/features/underwriting/utils/ruleUtils.ts`
- `supabase/functions/underwriting-ai-analyze/index.ts` - Use enhanced rules

---

## Next Session Instructions

1. **First:** Debug and fix the "+ Add Rule" freeze bug
   - Open browser DevTools, check for console errors
   - Add console.log to track re-renders in RuleBuilder
   - Check for infinite useEffect loops

2. **Then:** Review this plan with user for priorities
   - Which condition types are most important?
   - Do they want rule templates?
   - Timeline preferences?

3. **Start Implementation:** Begin with Phase 1 (health condition rules)
