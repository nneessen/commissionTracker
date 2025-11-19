// src/hooks/useKPILayout.ts

import { useState, useEffect } from 'react';
import { KPILayout } from '../types/dashboard.types';

const KPI_LAYOUT_KEY = 'kpi-layout-preference';
const DEFAULT_LAYOUT: KPILayout = 'heatmap';

/**
 * Custom hook for managing KPI layout preference with localStorage persistence
 *
 * @returns {[KPILayout, (layout: KPILayout) => void]} Current layout and setter function
 *
 * @example
 * ```tsx
 * const [layout, setLayout] = useKPILayout();
 * ```
 */
export function useKPILayout(): [KPILayout, (layout: KPILayout) => void] {
  const [layout, setLayoutState] = useState<KPILayout>(() => {
    // Initialize from localStorage if available
    try {
      const stored = localStorage.getItem(KPI_LAYOUT_KEY);
      if (stored && ['heatmap', 'narrative', 'matrix'].includes(stored)) {
        return stored as KPILayout;
      }
    } catch (error) {
      console.warn('Failed to read KPI layout from localStorage:', error);
    }
    return DEFAULT_LAYOUT;
  });

  const setLayout = (newLayout: KPILayout) => {
    setLayoutState(newLayout);

    // Persist to localStorage
    try {
      localStorage.setItem(KPI_LAYOUT_KEY, newLayout);
    } catch (error) {
      console.warn('Failed to save KPI layout to localStorage:', error);
    }
  };

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === KPI_LAYOUT_KEY && e.newValue) {
        if (['heatmap', 'narrative', 'matrix'].includes(e.newValue)) {
          setLayoutState(e.newValue as KPILayout);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return [layout, setLayout];
}
