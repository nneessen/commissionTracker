// src/features/expenses/context/ExpenseDateContext.tsx
// TODO: this file contains a bunch of mistakes. you wrote this. please review this as a senior dev doing a code review. find missing edge cases
// AdvancedTimePeriod, getAdvancedDateRange are not found
// is this file even being used for anything?
// IMPORTANT: This file is NOT BEING USED ANYWHERE - commenting out until needed

import React, { createContext, useContext, useState, useMemo } from "react";
// import { AdvancedDateRange } from "@/features/analytics/components/TimePeriodSelector";
// import type { AdvancedTimePeriod } from '@/types/expense.types';
// import { getAdvancedDateRange } from '@/lib/date';

// Temporary type definition until properly implemented
type AdvancedTimePeriod = "L30" | "L90" | "L180" | "YTD" | "custom";

interface ExpenseDateContextType {
  timePeriod: AdvancedTimePeriod;
  setTimePeriod: (period: AdvancedTimePeriod) => void;
  customRange: { startDate: Date; endDate: Date } | undefined;
  setCustomRange: (range: { startDate: Date; endDate: Date }) => void;
  dateRange: { startDate: Date; endDate: Date };
}

const ExpenseDateContext = createContext<ExpenseDateContextType | undefined>(
  undefined,
);

export function ExpenseDateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default to L90 (Last 90 days) to show recent expenses immediately
  const [timePeriod, setTimePeriod] = useState<AdvancedTimePeriod>("L90");
  const [customRange, setCustomRange] = useState<
    { startDate: Date; endDate: Date } | undefined
  >();

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    // Temporary implementation until getAdvancedDateRange is properly defined
    const now = new Date();
    let startDate = new Date();

    switch(timePeriod) {
      case "L30":
        startDate.setDate(now.getDate() - 30);
        break;
      case "L90":
        startDate.setDate(now.getDate() - 90);
        break;
      case "L180":
        startDate.setDate(now.getDate() - 180);
        break;
      case "YTD":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "custom":
        if (customRange) {
          return customRange;
        }
        startDate.setDate(now.getDate() - 30);
        break;
    }

    return {
      startDate,
      endDate: now,
    };
  }, [timePeriod, customRange]);

  const value = useMemo(
    () => ({
      timePeriod,
      setTimePeriod,
      customRange,
      setCustomRange,
      dateRange,
    }),
    [timePeriod, customRange, dateRange],
  );

  return (
    <ExpenseDateContext.Provider value={value}>
      {children}
    </ExpenseDateContext.Provider>
  );
}

export function useExpenseDateRange() {
  const context = useContext(ExpenseDateContext);
  if (!context) {
    throw new Error(
      "useExpenseDateRange must be used within ExpenseDateProvider",
    );
  }
  return context;
}
