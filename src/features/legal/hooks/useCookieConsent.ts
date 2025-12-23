// src/features/legal/hooks/useCookieConsent.ts
import { useState, useEffect, useCallback } from "react";

const CONSENT_KEY = "cookie-consent-accepted";

interface CookieConsentState {
  hasConsented: boolean;
  consentTimestamp: string | null;
  acceptConsent: () => void;
}

export function useCookieConsent(): CookieConsentState {
  const [hasConsented, setHasConsented] = useState<boolean>(true); // Default true to prevent flash
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      setHasConsented(true);
      setConsentTimestamp(stored);
    } else {
      setHasConsented(false);
    }
  }, []);

  const acceptConsent = useCallback(() => {
    const timestamp = new Date().toISOString();
    localStorage.setItem(CONSENT_KEY, timestamp);
    setHasConsented(true);
    setConsentTimestamp(timestamp);
  }, []);

  return {
    hasConsented,
    consentTimestamp,
    acceptConsent,
  };
}
