// src/services/expenses/categories/index.ts
export {
  expenseCategoryService,
  ExpenseCategoryServiceClass,
} from "./ExpenseCategoryService";
export { ExpenseCategoryRepository } from "./ExpenseCategoryRepository";

// Re-export types from types file
export type {
  ExpenseCategory,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from "@/types/expense.types";
