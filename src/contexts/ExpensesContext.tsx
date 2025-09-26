// src/contexts/ExpensesContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useExpenses } from '../hooks/useExpenses';

type ExpensesContextType = ReturnType<typeof useExpenses>;

const ExpensesContext = createContext<ExpensesContextType | null>(null);

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const expensesHook = useExpenses();

  return (
    <ExpensesContext.Provider value={expensesHook}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpensesContext() {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpensesContext must be used within ExpensesProvider');
  }
  return context;
}