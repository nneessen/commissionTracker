// src/hooks/ui/useResizableSidebar.ts

import { useState, useCallback, useEffect, useRef } from "react";

interface UseResizableSidebarOptions {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}

interface UseResizableSidebarReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Custom hook for managing resizable sidebar width with localStorage persistence
 *
 * @param options Configuration for sidebar resize behavior
 * @returns Object containing current width, resize state, and mousedown handler
 *
 * @example
 * ```tsx
 * const { width, isResizing, handleMouseDown } = useResizableSidebar({
 *   storageKey: 'messages-slack-sidebar-width',
 *   defaultWidth: 144,
 *   minWidth: 120,
 *   maxWidth: 400,
 * });
 * ```
 */
export function useResizableSidebar({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
}: UseResizableSidebarOptions): UseResizableSidebarReturn {
  // Initialize width from localStorage or use default
  const [width, setWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = Number(stored);
        // Validate stored value is within constraints
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn(`Failed to read ${storageKey} from localStorage:`, error);
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Handle mouse move during resize
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + delta;

      // Apply constraints
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(constrainedWidth);
    },
    [isResizing, minWidth, maxWidth],
  );

  // Handle mouse up to end resize
  const handleMouseUp = useCallback(() => {
    if (!isResizing) return;

    setIsResizing(false);

    // Persist to localStorage
    try {
      localStorage.setItem(storageKey, String(width));
    } catch (error) {
      console.warn(`Failed to save ${storageKey} to localStorage:`, error);
    }

    // Remove cursor style
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [isResizing, storageKey, width]);

  // Handle mouse down to start resize
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      // Set cursor style for entire document
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  // Attach/detach document-level event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return {
    width,
    isResizing,
    handleMouseDown,
  };
}
