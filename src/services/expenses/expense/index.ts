// src/services/expenses/expense/index.ts
export { expenseService, ExpenseServiceClass } from "./ExpenseService";
export { ExpenseRepository } from "./ExpenseRepository";
export type { ExpenseBaseEntity } from "./ExpenseRepository";

// Singleton instance for direct repository access
import { ExpenseRepository } from "./ExpenseRepository";
export const expenseRepository = new ExpenseRepository();
