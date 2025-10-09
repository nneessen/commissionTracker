# API Documentation

## Overview

This document outlines the API structure and service layer for the Commission Tracker application. All data operations go through Supabase with Row Level Security (RLS) enabled.

## Core Services

### 1. Policy Service (`/src/services/policies/`)

#### PolicyCRUDService
Handles all CRUD operations for insurance policies.

**Methods:**
- `createPolicy(policyData)` - Creates new policy with automatic commission calculation
- `updatePolicy(id, updates)` - Updates existing policy and recalculates commissions
- `deletePolicy(id)` - Soft deletes policy (sets status to 'cancelled')
- `getPolicy(id)` - Retrieves single policy with related data
- `listPolicies(filters)` - Lists policies with pagination and filtering

**Filters:**
- `status`: 'active' | 'lapsed' | 'cancelled'
- `dateRange`: { start: Date, end: Date }
- `carrierId`: string
- `productId`: string
- `timePeriod`: 'mtd' | 'ytd' | 'last30' | 'last60' | 'last90' | 'custom'

### 2. Commission Service (`/src/services/commissions/`)

#### CommissionCalculationService
Handles commission calculations based on contract levels.

**Methods:**
- `calculateCommission(policyData)` - Calculates commission based on contract settings
- `getContractRate(carrierId, productId, contractLevel)` - Gets commission rate
- `applyAdvance(commissionId, advanceAmount)` - Records advance payment
- `applySplit(commissionId, splitPercentage, agentId)` - Applies upline split

#### CommissionCRUDService
Manages commission records in the database.

**Methods:**
- `createCommission(data)` - Creates new commission record
- `updateCommission(id, updates)` - Updates commission details
- `listCommissions(filters)` - Lists commissions with filtering
- `getCommissionsByPolicy(policyId)` - Gets all commissions for a policy

### 3. Expense Service (`/src/services/expenses/`)

#### ExpenseManagementService
Handles business expense tracking.

**Methods:**
- `createExpense(expenseData)` - Creates new expense record
- `updateExpense(id, updates)` - Updates expense details
- `deleteExpense(id)` - Deletes expense record
- `listExpenses(filters)` - Lists expenses with filtering
- `getExpenseCategories()` - Gets available expense categories
- `getExpenseSummary(dateRange)` - Gets expense summary by category

**Expense Categories:**
- Travel (mileage, gas, lodging)
- Office (supplies, equipment, software)
- Marketing (advertising, leads, events)
- Professional (licensing, training, memberships)
- Other (miscellaneous business expenses)

### 4. Settings Service (`/src/services/settings/`)

#### CommissionSettingsService
Manages contract-level commission settings.

**Methods:**
- `getCommissionSettings()` - Gets all commission settings
- `upsertCommissionSetting(setting)` - Creates or updates commission setting
- `deleteCommissionSetting(id)` - Removes commission setting
- `getSettingByContract(carrierId, productId, contractLevel)` - Gets specific setting

#### UserPreferencesService
Manages user preferences and goals.

**Methods:**
- `getUserPreferences()` - Gets user preferences
- `updateUserPreferences(updates)` - Updates preferences
- `getGoals()` - Gets user's sales goals
- `updateGoals(goalData)` - Updates sales goals

## Database Schema

### Core Tables

#### policies
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- policy_number: text
- client_name: text
- client_email: text
- client_phone: text
- client_state: text
- carrier_id: uuid (references carriers)
- product_id: uuid (references products)
- policy_start_date: date
- annual_premium: decimal
- premium_mode: text ('Annual', 'Semi-Annual', 'Quarterly', 'Monthly')
- status: text ('active', 'lapsed', 'cancelled')
- contract_level: text
- created_at: timestamptz
- updated_at: timestamptz
```

#### commissions
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- policy_id: uuid (references policies)
- commission_amount: decimal
- advance_amount: decimal
- split_percentage: decimal
- split_agent_id: uuid
- status: text ('pending', 'paid', 'charged_back')
- paid_date: date
- created_at: timestamptz
```

#### commission_settings
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- carrier_id: uuid (references carriers)
- product_id: uuid (references products)
- contract_level: text
- rate_type: text ('percentage', 'flat', 'tiered')
- rate_value: jsonb
- is_active: boolean
- created_at: timestamptz
```

#### expenses
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- expense_date: date
- category: text
- subcategory: text
- description: text
- amount: decimal
- is_reimbursable: boolean
- receipt_url: text
- created_at: timestamptz
```

## Authentication & Security

### Authentication Flow
1. User signs up/logs in via Supabase Auth
2. Email verification required for new accounts
3. Session tokens stored in cookies
4. All API calls include auth headers

### Row Level Security (RLS)
All tables have RLS policies enforcing:
- Users can only see their own data
- Insert operations check user_id matches auth.uid()
- Update/delete operations verify ownership

### Security Headers
```typescript
headers: {
  'Authorization': `Bearer ${session.access_token}`,
  'apikey': SUPABASE_ANON_KEY,
  'Content-Type': 'application/json'
}
```

## Query Hooks (TanStack Query)

### Policy Hooks (`/src/hooks/policies/`)
- `usePolicies(filters)` - Fetches paginated policies
- `usePolicy(id)` - Fetches single policy
- `useCreatePolicy()` - Mutation for creating policies
- `useUpdatePolicy()` - Mutation for updating policies
- `useDeletePolicy()` - Mutation for deleting policies

### Commission Hooks (`/src/hooks/commissions/`)
- `useCommissions(filters)` - Fetches commissions
- `useCommissionSettings()` - Fetches commission settings
- `useUpdateCommissionSetting()` - Mutation for settings

### Expense Hooks (`/src/hooks/expenses/`)
- `useExpenses(filters)` - Fetches expenses
- `useCreateExpense()` - Mutation for creating expenses
- `useExpenseCategories()` - Fetches categories

## Error Handling

### Error Response Format
```typescript
{
  error: {
    message: string;
    code: string;
    details?: any;
  }
}
```

### Common Error Codes
- `AUTH_ERROR` - Authentication failed
- `PERMISSION_DENIED` - RLS policy violation
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Input validation failed
- `RATE_LIMIT` - Too many requests

## Performance Optimizations

### Caching Strategy
- TanStack Query handles client-side caching
- Default stale time: 5 minutes
- Background refetch on window focus
- Optimistic updates for better UX

### Database Indexes
Key indexes for performance:
- `policies(user_id, status, created_at)`
- `commissions(user_id, policy_id)`
- `commission_settings(user_id, carrier_id, product_id, contract_level)`
- `expenses(user_id, expense_date, category)`

### Pagination
Cursor-based pagination for large datasets:
```typescript
{
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}
```

## Rate Limiting
- Supabase enforces rate limits
- Client implements exponential backoff
- Retry logic for failed requests

## Monitoring & Logging
- Performance metrics tracked via PerformanceMonitoringService
- Error logging to console in development
- Consider adding Sentry or similar for production