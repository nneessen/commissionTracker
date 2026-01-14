// Custom Domain Context
// Detects if app is loaded on a custom domain and resolves to recruiter_slug

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { CustomDomainContextValue } from "@/types/custom-domain.types";

const SUPABASE_FUNCTIONS_URL =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// Primary domains (not custom domains)
const PRIMARY_DOMAINS = [
  "thestandardhq.com",
  "www.thestandardhq.com",
  "localhost",
  "127.0.0.1",
];

// Vercel preview deployments should be treated as primary
const isVercelPreview = (hostname: string) =>
  hostname.endsWith(".vercel.app") || hostname.endsWith(".vercel.sh");

const CustomDomainContext = createContext<CustomDomainContextValue>({
  customDomainSlug: null,
  isCustomDomain: false,
  isLoading: true,
  error: null,
});

export function useCustomDomain() {
  const context = useContext(CustomDomainContext);
  if (!context) {
    throw new Error("useCustomDomain must be used within CustomDomainProvider");
  }
  return context;
}

interface CustomDomainProviderProps {
  children: ReactNode;
}

export function CustomDomainProvider({ children }: CustomDomainProviderProps) {
  const [state, setState] = useState<CustomDomainContextValue>({
    customDomainSlug: null,
    isCustomDomain: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const hostname = window.location.hostname;

    // Check if on primary domain or Vercel preview
    const isPrimary =
      PRIMARY_DOMAINS.includes(hostname) || isVercelPreview(hostname);

    if (isPrimary) {
      setState({
        customDomainSlug: null,
        isCustomDomain: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    // This is a custom domain - resolve via Edge Function
    const resolveCustomDomain = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_FUNCTIONS_URL}/resolve-custom-domain?hostname=${encodeURIComponent(hostname)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (response.status === 404) {
          // Domain not configured or inactive
          setState({
            customDomainSlug: null,
            isCustomDomain: true,
            isLoading: false,
            error: "Domain not configured",
          });
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.recruiter_slug) {
          setState({
            customDomainSlug: data.recruiter_slug,
            isCustomDomain: true,
            isLoading: false,
            error: null,
          });
        } else {
          setState({
            customDomainSlug: null,
            isCustomDomain: true,
            isLoading: false,
            error: "Domain not configured",
          });
        }
      } catch (err) {
        console.error("[CustomDomainProvider] Resolution failed:", err);
        setState({
          customDomainSlug: null,
          isCustomDomain: true,
          isLoading: false,
          error: "Failed to resolve domain",
        });
      }
    };

    resolveCustomDomain();
  }, []);

  return (
    <CustomDomainContext.Provider value={state}>
      {children}
    </CustomDomainContext.Provider>
  );
}
