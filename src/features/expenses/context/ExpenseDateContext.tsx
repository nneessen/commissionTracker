// src/features/expenses/context/ExpenseDateContext.tsx
// TODO: this file contains a bunch of mistakes. you wrote this. please review this as a senior dev doing a code review. find missing edge cases
// AdvancedTimePeriod, getAdvancedDateRange are not found
// is this file even being used for anything?

import React, { createContext, useContext, useState, useMemo } from "react";
import { AdvancedDateRange, AdvancedTimePeriod, getAdvancedDateRange } from "@/features/analytics/components/TimePeriodSelector";

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
    const range = getAdvancedDateRange(timePeriod, customRange);
    return {
      startDate: range.startDate,
      endDate: range.endDate,
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
