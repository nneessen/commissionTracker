# Fix Carrier Update Error Plan
**Date**: 2025-01-29
**Issue**: Carrier update fails with "this.client.from(...).update(...).eq is not a function"

## Problem Summary
When editing a carrier in the Settings > Carriers tab, the update fails because LocalApiClient doesn't implement the fluent API chaining pattern expected by BaseRepository.

### Error Details
```
Error: this.client.from(...).update(...).eq is not a function
```

### Root Cause
BaseRepository expects Supabase-style method chaining:
```typescript
this.client
  .from(this.tableName)
  .update(dbData)
  .eq("id", id)
  .select()
  .single()
```

But LocalApiClient returns `this` from `from()` method and doesn't have chainable `update()`, `eq()`, `select()`, or `single()` methods.

## Solution Plan

### TODO List

- [ ] **Analyze current LocalApiClient structure**
  - Review all methods that need chaining support
  - Identify the query building pattern needed

- [ ] **Implement fluent API in LocalApiClient**
  - Add `update()` method that returns `this` for chaining
  - Add `eq()` method for filter conditions
  - Add `select()` method for field selection
  - Add `single()` method to return single result
  - Modify execute pattern to build query then run

- [ ] **Update LocalApiClient.update() method**
  - Change from direct execution to query builder pattern
  - Store update data in queryState
  - Execute on terminal methods (select, single)

- [ ] **Add filter methods**
  - Implement `eq(column, value)` for equality filters
  - Store filters in queryState for execution

- [ ] **Add terminal execution methods**
  - `select()` - execute query and return multiple results
  - `single()` - execute query and return single result

- [ ] **Test the fix**
  - Start dev server with `npm run dev:local`
  - Navigate to Settings > Carriers
  - Edit "American Amicable" carrier
  - Change short name to "AMAM"
  - Save and verify success

- [ ] **Verify other operations still work**
  - Create new carrier
  - Delete carrier
  - List carriers

## Implementation Details

### 1. Query State Structure
```typescript
interface QueryState {
  table: string;
  operation?: 'select' | 'insert' | 'update' | 'delete';
  data?: any;
  filters: Array<{column: string, operator: string, value: any}>;
  select: string[];
  single: boolean;
}
```

### 2. Method Chaining Pattern
```typescript
class LocalApiClient {
  private queryState: QueryState;

  from(table: string) {
    this.queryState = { table, filters: [], select: ['*'], single: false };
    return this;
  }

  update(data: any) {
    this.queryState.operation = 'update';
    this.queryState.data = data;
    return this;
  }

  eq(column: string, value: any) {
    this.queryState.filters.push({ column, operator: 'eq', value });
    return this;
  }

  select(columns?: string) {
    this.queryState.select = columns ? columns.split(',') : ['*'];
    return this.execute();
  }

  single() {
    this.queryState.single = true;
    return this.execute();
  }

  private async execute() {
    // Build and execute the actual API call
  }
}
```

### 3. Files to Modify
- `src/services/base/localApi.ts` - Main implementation

### 4. Testing Checklist
- [ ] Edit carrier short name works
- [ ] Edit carrier full name works
- [ ] Create new carrier works
- [ ] Delete carrier works
- [ ] List carriers still displays correctly

## Risk Assessment
- **Low Risk**: Changes are isolated to LocalApiClient
- **No Migration**: No database changes needed
- **Backward Compatible**: Existing direct method calls will still work

## Success Criteria
- Carrier update operations complete without errors
- All CRUD operations for carriers work correctly
- No regression in other features