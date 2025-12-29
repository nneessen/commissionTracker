# BaseService Migration - Exact Step-by-Step Procedure

**Purpose:** Precise, copy-paste-able procedure for migrating each service to BaseService

**Follow this procedure EXACTLY for each service migration.**

---

## Pre-Migration Checklist

Before starting ANY service migration, verify:

- [ ] Previous service migration is committed
- [ ] Build is passing: `npm run build`
- [ ] No uncommitted changes: `git status`
- [ ] TODO list is updated

---

## Step 1: Identify Service & Repository

### 1.1 List Service Files

```bash
# Pattern: ServiceName in PascalCase (e.g., ProductService)
SERVICE_NAME="<ServiceName>"
SERVICE_FILE="src/services/<path>/${SERVICE_NAME}.ts"
```

### 1.2 Verify Repository Exists

```bash
# Check repository file
REPOSITORY_NAME="${SERVICE_NAME}Repository"
REPOSITORY_FILE="src/services/<path>/${REPOSITORY_NAME}.ts"

# Read first 50 lines to verify it extends BaseRepository
head -50 "$REPOSITORY_FILE"
```

**Expected:** Should see `extends BaseRepository<...>`

**If NOT extending BaseRepository:** STOP. Repository must be migrated first.

---

## Step 2: Schema Analysis

### 2.1 Find Database Table Name

```bash
# Read repository to find table name
grep -n "super(" "$REPOSITORY_FILE" | head -5
```

**Extract:** Table name from `super("table_name")`

### 2.2 Read Database Schema

```bash
# Search for table schema in database.types.ts
TABLE_NAME="<table_name>"  # From step 2.1
grep -A 50 "${TABLE_NAME}:" src/types/database.types.ts
```

**Document:**

- Required fields (no `?` in Insert type)
- Nullable fields (`| null` in Row type)
- Enum fields (`Database["public"]["Enums"]["..."]`)
- Default values (check Insert type)

### 2.3 Read Entity Types

```bash
# Read entity type definitions
TYPE_FILE="src/types/<entity>.types.ts"
cat "$TYPE_FILE"
```

**Identify:**

- Entity interface (e.g., `Product`, `Carrier`)
- Create input type (e.g., `ProductFormData`, `NewCarrierForm`)
- Update input type (usually `Partial<CreateInput>`)
- Any custom types (enums, nested objects)

---

## Step 3: Current Service Analysis

### 3.1 Read Current Service

```bash
cat "$SERVICE_FILE"
```

### 3.2 Identify CRUD Methods (TO REMOVE)

Mark lines for these methods:

- [ ] `getAll()` - Lines \_\_\_
- [ ] `getById()` - Lines \_\_\_
- [ ] `create()` - Lines \_\_\_
- [ ] `update()` - Lines \_\_\_
- [ ] `delete()` - Lines \_\_\_
- [ ] `bulkCreate()` or similar - Lines \_\_\_

**Count total lines to remove:** \_\_\_

### 3.3 Identify Business Methods (TO PRESERVE)

List all non-CRUD methods:

- `methodName()` - Lines **_ (Purpose: _**)
- `methodName()` - Lines **_ (Purpose: _**)

### 3.4 Identify Edge Cases

Check for:

- [ ] Default values (e.g., `is_active ?? true`)
- [ ] Auth checks (e.g., `supabase.auth.getUser()`)
- [ ] Field transformations (e.g., `as Json`, `|| null`)
- [ ] External service calls
- [ ] RPC function calls
- [ ] Legacy API methods (@deprecated)

---

## Step 4: Design Validation Rules

For each required field and important optional field, design a validation rule:

### 4.1 Required Fields

```typescript
{
  field: "<field_name>",
  validate: (value) => typeof value === "string" && value.trim().length > 0,
  message: "<Field name> is required",
}
```

### 4.2 Optional Fields with Constraints

```typescript
{
  field: "<field_name>",
  validate: (value) => {
    if (value === undefined || value === null) return true; // Optional
    // Add specific validation
    return /* condition */;
  },
  message: "<Validation error message>",
}
```

### 4.3 Enum Fields

```typescript
{
  field: "<field_name>",
  validate: (value) => {
    const validValues: EnumType[] = ["value1", "value2", ...];
    return validValues.includes(value as EnumType);
  },
  message: "Invalid <field>. Must be one of: ...",
}
```

### 4.4 Cross-Field Validation

```typescript
{
  field: "max_value",
  validate: (value, data) => {
    if (value === undefined || value === null) return true;
    const minValue = data?.min_value ? Number(data.min_value) : null;
    const maxValue = Number(value);
    if (isNaN(maxValue)) return false;
    if (minValue !== null && maxValue < minValue) return false;
    return true;
  },
  message: "Max value must be >= min value",
}
```

### 4.5 Format Validation (Email, URL, UUID, Phone)

```typescript
// Email
{
  field: "email",
  validate: (value) => {
    if (!value) return true; // Optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value as string);
  },
  message: "Invalid email format",
}

// URL
{
  field: "website",
  validate: (value) => {
    if (!value) return true; // Optional
    try {
      new URL(value as string);
      return true;
    } catch {
      return false;
    }
  },
  message: "Invalid URL format",
}

// UUID
{
  field: "id",
  validate: (value) => {
    if (!value) return true; // Optional
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof value === "string" && uuidRegex.test(value);
  },
  message: "Must be a valid UUID",
}

// Phone (basic - min 10 chars)
{
  field: "phone",
  validate: (value) => {
    if (!value) return true; // Optional
    return typeof value === "string" && value.trim().length >= 10;
  },
  message: "Phone number must be at least 10 characters",
}
```

---

## Step 5: Determine Migration Pattern

### Pattern A: Simple (Form Types Match Repository Types)

**Use when:** CreateInput type from types file matches what repository expects

**Example:** ProductService

```typescript
export class XService extends BaseService<
  Entity,
  CreateInput,
  Partial<CreateInput>
> {
  constructor(repository: XRepository) {
    super(repository);
  }

  protected initializeValidationRules(): void {
    this.validationRules = [
      /* rules */
    ];
  }

  // Override create() ONLY if you need to set defaults
  async create(data: CreateInput): Promise<ServiceResponse<Entity>> {
    const dataWithDefaults: CreateInput = {
      ...data,
      some_field: data.some_field ?? default_value,
    };
    return super.create(dataWithDefaults);
  }

  // Business methods
  async businessMethod(): Promise<ServiceResponse<Entity[]>> {
    try {
      const repo = this.repository as XRepository;
      const result = await repo.customMethod();
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
```

### Pattern B: Complex (Form Types Differ from Repository Types)

**Use when:** User-facing form type differs from what repository expects

**Example:** CarrierService

```typescript
import type { XRow } from "@/types/x.types";
import type { Json } from "@/types/database.types";

type XEntity = Entity;
type XCreateData = Omit<XRow, "id" | "created_at" | "updated_at">;
type XUpdateData = Partial<XRow>;

export class XService extends BaseService<XEntity, XCreateData, XUpdateData> {
  constructor(repository: XRepository) {
    super(repository);
  }

  protected initializeValidationRules(): void {
    this.validationRules = [
      /* rules */
    ];
  }

  /**
   * Create from form data (User-facing API)
   */
  async createFromForm(data: FormInput): Promise<ServiceResponse<XEntity>> {
    const repositoryData: XCreateData = {
      field1: data.field1,
      field2: data.field2 || null,
      field3: data.field3 ?? default_value,
      // Transform as needed
    };
    return super.create(repositoryData);
  }

  /**
   * Update from form data (User-facing API)
   */
  async updateFromForm(
    id: string,
    data: Partial<FormInput>,
  ): Promise<ServiceResponse<XEntity>> {
    const repositoryData: XUpdateData = {};
    if (data.field1 !== undefined) repositoryData.field1 = data.field1;
    if (data.field2 !== undefined) repositoryData.field2 = data.field2 || null;
    // Transform as needed
    return super.update(id, repositoryData);
  }

  /**
   * Create many from form data (User-facing API)
   */
  async createManyFromForm(
    items: FormInput[],
  ): Promise<ServiceResponse<XEntity[]>> {
    const repositoryItems: XCreateData[] = items.map((data) => ({
      // Same transformation as createFromForm
    }));
    return super.createMany(repositoryItems);
  }

  // Business methods
}
```

---

## Step 6: Write the Migration

### 6.1 Create New Service File

**Pattern A Template:**

```typescript
// src/services/.../XService.ts
import { BaseService, type ServiceResponse } from "../../base/BaseService";
import { XRepository } from "./XRepository";
import type { Entity, CreateInput } from "@/types/x.types";
import type { Database } from "@/types/database.types";

// Type aliases for enums if needed
type EnumType = Database["public"]["Enums"]["enum_name"];

type EntityType = Entity;

/**
 * Service for X business logic
 * Extends BaseService for standard CRUD operations
 */
export class XService extends BaseService<
  EntityType,
  CreateInput,
  Partial<CreateInput>
> {
  constructor(repository: XRepository) {
    super(repository);
  }

  /**
   * Initialize validation rules
   */
  protected initializeValidationRules(): void {
    this.validationRules = [
      // Add validation rules from Step 4
    ];
  }

  /**
   * Override create to set defaults if needed
   */
  async create(data: CreateInput): Promise<ServiceResponse<EntityType>> {
    const dataWithDefaults: CreateInput = {
      ...data,
      // Add defaults
    };
    return super.create(dataWithDefaults);
  }

  // ============================================================================
  // BUSINESS LOGIC METHODS
  // ============================================================================

  /**
   * [Copy business methods from old service]
   */
  async businessMethod(): Promise<ServiceResponse<EntityType[]>> {
    try {
      const repo = this.repository as XRepository;
      const result = await repo.customMethod();
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // ============================================================================
  // INHERITED FROM BaseService (no code needed):
  // ============================================================================
  // - getAll(options?, filters?): Promise<ServiceResponse<EntityType[]>>
  // - getById(id: string): Promise<ServiceResponse<EntityType>>
  // - update(id: string, updates: Partial<CreateInput>): Promise<ServiceResponse<EntityType>>
  // - delete(id: string): Promise<ServiceResponse<void>>
  // - createMany(items: CreateInput[]): Promise<ServiceResponse<EntityType[]>>
  // - getPaginated(page, pageSize, filters?, orderBy?, orderDirection?): Promise<ServiceResponse<ListResponse<EntityType>>>
  // - exists(id: string): Promise<boolean>
  // - count(filters?): Promise<number>
}

// Singleton instance
const xRepository = new XRepository();
export const xService = new XService(xRepository);

// Export class for testing
export { XService as XServiceClass };
```

### 6.2 Write File

```bash
# Save the new service file
Write the file to "$SERVICE_FILE"
```

---

## Step 7: Update Hooks (if Pattern B or if hooks exist)

### 7.1 Find Hook Files

```bash
# Search for service usage
grep -r "xService.create(" src/hooks/ src/features/
grep -r "xService.update(" src/hooks/ src/features/
```

### 7.2 Update Each Hook

**Pattern A:** No changes needed (API is the same)

**Pattern B:** Update to use `*FromForm` methods

```bash
# For each file found:
# Read it
cat <hook_file>

# Update calls:
# xService.create(data) → xService.createFromForm(data)
# xService.update(id, data) → xService.updateFromForm(id, data)
```

---

## Step 8: Testing

### 8.1 Type Check

```bash
npm run typecheck 2>&1 | grep -E "(error|XService)" | head -20
```

**Expected:** No errors

**If errors:** Fix them before continuing

### 8.2 Build

```bash
npm run build 2>&1 | tail -10
```

**Expected:** "✓ built in Xs"

**If errors:** Fix them before continuing

### 8.3 Check for Service Usage

```bash
# Make sure no remaining calls to old API
grep -r "xService.create(" src/ --include="*.ts" --include="*.tsx"
grep -r "xService.update(" src/ --include="*.ts" --include="*.tsx"
```

**Pattern A:** Should find calls (API unchanged)
**Pattern B:** Should find NO calls (all should use `*FromForm`)

---

## Step 9: Review Checklist

Before committing, verify:

### Type Safety

- [ ] All types from database.types.ts
- [ ] Zero `any` types
- [ ] Correct generic parameters on BaseService
- [ ] Repository cast uses concrete type: `as XRepository`
- [ ] All business methods have correct return types

### Edge Cases

- [ ] Null/undefined handling for optional fields
- [ ] Required field validation
- [ ] Enum validation (if applicable)
- [ ] Cross-field validation (if applicable)
- [ ] Default values applied (e.g., is_active = true)
- [ ] Error handling for DB constraints
- [ ] External service failures handled (if applicable)

### Code Quality

- [ ] CRUD methods removed (inherited from BaseService)
- [ ] Business logic preserved exactly
- [ ] Legacy API maintained if needed (@deprecated)
- [ ] ServiceResponse pattern consistent
- [ ] No code duplication
- [ ] Comments clear and accurate

### Testing

- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes (zero errors)
- [ ] All hooks updated (if Pattern B)
- [ ] No breaking changes

---

## Step 10: Commit

### 10.1 Stage Changes

```bash
git add src/services/.../XService.ts
# If hooks updated:
git add src/hooks/.../...
git add src/features/.../...
```

### 10.2 Commit Message Template

```bash
git commit -m "refactor(services): migrate XService to BaseService

- Extends BaseService for CRUD operations
- Removes <N> lines of CRUD boilerplate (getAll, getById, create, update, delete)
- Adds <M> validation rules:
  * Required: <field1>, <field2>
  * Optional but validated: <field3>, <field4>
  * [Specific validations listed]
- Preserves <K> business logic methods:
  * <method1()> - <purpose>
  * <method2()> - <purpose>
[If Pattern B:]
- Creates form-to-repository transformation layer:
  * createFromForm(FormInput) → transforms to repository format
  * updateFromForm(id, Partial<FormInput>) → transforms to repository format
  * createManyFromForm(FormInput[]) → batch transformation
- Updates <X> hooks/components to use new API:
  * <hook1> → createFromForm()
  * <hook2> → updateFromForm()
[End Pattern B]
- Zero any types, strict type safety from database.types.ts

Testing:
- Type check: ✓ PASSED
- Build: ✓ PASSED
- No existing tests / All tests passing

Edge cases handled:
- <List specific edge cases>
- <Default values>
- <Null handling>
- <Validation specifics>

[If Pattern B:]
Pattern learned:
- When form types differ from repository types, create *FromForm methods
- Don't override base methods with incompatible signatures
- Update all callers to use new API
[End Pattern B]"
```

### 10.3 Verify Commit

```bash
git log -1 --stat
```

**Check:** Correct files changed, commit message clear

---

## Step 11: Update Progress

### 11.1 Update TODO List

```typescript
TodoWrite([
  // Mark current service as completed
  {
    content: "Migrate XService to BaseService",
    activeForm: "...",
    status: "completed",
  },
  // Mark next service as pending or in_progress
  {
    content: "Migrate NextService to BaseService",
    activeForm: "...",
    status: "pending",
  },
  // Keep rest
]);
```

### 11.2 Update Continuation File

```bash
# Edit plans/active/baseservice-migration-continuation.md
# Update:
# - Completed count
# - Add XService to completed list
# - Update "Next Service" section
# - Add any lessons learned
```

---

## Step 12: Write Session Summary

For each service completed, document:

### Service Summary Template

```markdown
## XService Migration (COMPLETED)

**Complexity:** ⭐ / ⭐⭐ / ⭐⭐⭐

**Lines Removed:** <N>
**Validation Rules Added:** <M>

**Edge Cases Handled:**

- <List>

**Pattern Used:** A (Simple) / B (Complex)

**Files Changed:** <N>

- src/services/.../XService.ts
  [If Pattern B:]
- src/hooks/.../... (updated to use \*FromForm)
  [End]

**Testing:**

- Type check: ✅
- Build: ✅

**Lessons Learned:**

- <Any new patterns or gotchas>

**Time Taken:** ~X minutes
```

---

## Step 13: Prepare for Next Service

### 13.1 Clean State

```bash
git status  # Should be clean
npm run build  # Should pass
```

### 13.2 Identify Next Service

```bash
# From plan file or continuation file
# Set SERVICE_NAME for next iteration
```

### 13.3 Return to Step 1

---

## Quick Reference: Common Patterns

### Default Value Pattern

```typescript
async create(data: CreateInput): Promise<ServiceResponse<Entity>> {
  const dataWithDefaults: CreateInput = {
    ...data,
    is_active: data.is_active ?? true,
    created_at: data.created_at ?? new Date().toISOString(),
  };
  return super.create(dataWithDefaults);
}
```

### Repository Cast Pattern

```typescript
async businessMethod(): Promise<ServiceResponse<Entity[]>> {
  try {
    const repo = this.repository as XRepository;
    const result = await repo.customMethod();
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
```

### Legacy API Pattern

```typescript
/**
 * @deprecated Use createFromForm() instead
 */
async create_legacy(data: OldInput): Promise<ServiceResponse<Entity>> {
  return this.createFromForm(data);
}
```

---

## Troubleshooting

### Error: Type 'X' is not assignable to parameter of type 'Y'

**Cause:** Form type differs from repository type
**Solution:** Use Pattern B with `*FromForm` methods

### Error: Property 'X' is missing in type 'Y'

**Cause:** Form type missing fields that repository requires
**Solution:** Add transformation in `createFromForm` to include missing fields (often with null or default values)

### Error: Cannot override method with different signature

**Cause:** Trying to override base method with different parameter types
**Solution:** Don't override - create separate `*FromForm` method instead

### Build succeeds but hooks have errors

**Cause:** Hooks still calling old API
**Solution:** Update hooks to use new method names (Pattern B)

---

## Success Criteria Checklist (Final Check)

Before marking service as complete:

- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Build passes
- [ ] All CRUD boilerplate removed
- [ ] All business logic preserved
- [ ] All validation rules added
- [ ] All edge cases handled
- [ ] All hooks updated (if needed)
- [ ] Git committed with clear message
- [ ] TODO list updated
- [ ] Continuation file updated
- [ ] No breaking changes

**If ALL checked:** Service migration COMPLETE ✅

**If ANY unchecked:** Fix issues before marking complete

---

## END OF PROCEDURE

**Next Action:** Return to Step 1 for next service
