# Continuation Prompt - Commission Tracker

**Date**: 2026-01-03
**Priority**: P0 - USER REPORTED BUG

---

## CRITICAL ISSUE - FAKE EXPENSES

### Problem
User reports fake/unwanted expenses in the system that:
1. They did NOT create
2. Cannot be deleted (deletion not working)

### Investigation Steps

1. Check for mock data or seed scripts in expense-related code
2. Check expense service for any auto-creation logic
3. Check database for expense records and their created_at timestamps
4. Check if deletion is blocked by RLS or foreign keys

### Key Files to Check

- `src/features/expenses/` - Expense UI components
- `src/services/expenses/expenseService.ts` - Expense business logic
- `src/services/expenses/ExpenseRepository.ts` - Database operations
- `src/hooks/expenses/useExpenses.ts` - React Query hooks

---

## COMPLETED LAST SESSION

- Policy Edit Form: Added validation toast, fixed form pre-population
- Carrier Advance Cap: Fixed persistence with "in" operator check
- Slack Notification: Fixed NULL hierarchy_depth handling

---

## PENDING

- Registration System Verification (P1) - needs manual testing
