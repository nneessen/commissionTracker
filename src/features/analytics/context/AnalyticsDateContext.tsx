import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AdvancedTimePeriod, getAdvancedDateRange } from '../components/TimePeriodSelector';

interface DateRangeContextValue {
  timePeriod: AdvancedTimePeriod;
  setTimePeriod: (period: AdvancedTimePeriod) => void;
  customRange: {
    startDate: Date;
    endDate: Date;
  };
  setCustomRange: (range: { startDate: Date; endDate: Date }) => void;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

const AnalyticsDateContext = createContext<DateRangeContextValue | undefined>(undefined);

export function AnalyticsDateProvider({ children }: { children: ReactNode }) {
  const [timePeriod, setTimePeriod] = useState<AdvancedTimePeriod>('MTD');
  const [customRange, setCustomRange] = useState<{
    startDate: Date;
    endDate: Date;
  }>({
    startDate: new Date(),
    endDate: new Date(),
  });

  // Calculate the actual date range based on the selected period
  const dateRange = getAdvancedDateRange(timePeriod, customRange);

  const value: DateRangeContextValue = {
    timePeriod,
    setTimePeriod,
    customRange,
    setCustomRange,
    dateRange,
  };

  return (
    <AnalyticsDateContext.Provider value={value}>
      {children}
    </AnalyticsDateContext.Provider>
  );
}

export function useAnalyticsDateRange() {
  const context = useContext(AnalyticsDateContext);
  if (context === undefined) {
    throw new Error('useAnalyticsDateRange must be used within an AnalyticsDateProvider');
  }
  return context;
}