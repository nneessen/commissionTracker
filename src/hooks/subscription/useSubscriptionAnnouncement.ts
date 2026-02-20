// src/hooks/subscription/useSubscriptionAnnouncement.ts

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "subscription-announcement-last-seen";
const CUTOFF_DATE = new Date("2026-03-01T00:00:00Z");

interface SubscriptionAnnouncementState {
  shouldShow: boolean;
  dismiss: () => void;
}

/**
 * Hook to manage the subscription tier announcement dialog display.
 * Shows once per day until March 1, 2026, tracked in localStorage.
 */
export function useSubscriptionAnnouncement(): SubscriptionAnnouncementState {
  // Default to false to prevent flash
  const [shouldShow, setShouldShow] = useState<boolean>(false);

  useEffect(() => {
    // Check if we're past the cutoff date
    const now = new Date();
    if (now >= CUTOFF_DATE) {
      setShouldShow(false);
      return;
    }

    // Check localStorage for last seen date
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (!lastSeen) {
      setShouldShow(true);
      return;
    }

    // Parse the stored date and check if it's a different day
    const lastSeenDate = new Date(lastSeen);
    const today = now;

    // Compare dates (ignoring time)
    const isSameDay =
      lastSeenDate.getFullYear() === today.getFullYear() &&
      lastSeenDate.getMonth() === today.getMonth() &&
      lastSeenDate.getDate() === today.getDate();

    setShouldShow(!isSameDay);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setShouldShow(false);
  }, []);

  return {
    shouldShow,
    dismiss,
  };
}
