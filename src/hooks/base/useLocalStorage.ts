// src/hooks/base/useLocalStorage.ts
import {logger} from '../../services/base/logger';

import {useState, useEffect} from 'react';

/**
 * Temporary compatibility hook for localStorage state management
 * This will be replaced by Supabase hooks in the migration
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.error(`Error reading localStorage key "${key}"`, error instanceof Error ? error : String(error), "useLocalStorage");
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      logger.error(`Error setting localStorage key "${key}"`, error instanceof Error ? error : String(error), "useLocalStorage");
    }
  };

  return [storedValue, setValue] as const;
}