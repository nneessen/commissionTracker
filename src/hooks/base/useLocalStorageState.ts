// /home/nneessen/projects/commissionTracker/src/hooks/base/useLocalStorageState.ts

import { useState, useEffect, useRef } from 'react';

export interface UseLocalStorageStateOptions {
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}

/**
 * Custom hook for managing state synchronized with localStorage
 * @param key - The localStorage key
 * @param initialValue - Initial value if no stored value exists
 * @param options - Optional serialization/deserialization functions
 * @returns [value, setValue, removeValue] tuple
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageStateOptions
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options || {};

  const initialValueRef = useRef(initialValue);

  // Initialize state with value from localStorage or initial value
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return deserialize(item);
      }
      return initialValueRef.current;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValueRef.current;
    }
  });

  // Update localStorage when state changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, serialize(state));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, state, serialize]);

  // Handle storage events from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setState(deserialize(e.newValue));
        } catch (error) {
          console.error(`Error parsing storage event for ${key}:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize]);

  const setValue = (value: T | ((prev: T) => T)) => {
    setState(value);
  };

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setState(initialValueRef.current);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  };

  return [state, setValue, removeValue];
}