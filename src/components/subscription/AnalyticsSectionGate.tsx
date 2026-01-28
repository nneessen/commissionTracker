// src/components/subscription/AnalyticsSectionGate.tsx
// Gate component for analytics sections based on subscription tier
// Simply hides sections the user doesn't have access to (no lock icons)

import type { ReactNode } from "react";
import {
  useAnalyticsSectionAccess,
  type AnalyticsSectionKey,
} from "@/hooks/subscription";

interface AnalyticsSectionGateProps {
  /** The analytics section key to gate */
  section: AnalyticsSectionKey;
  /** Content to display when user has access */
  children: ReactNode;
  /** Additional CSS classes for the wrapper (unused, kept for API compatibility) */
  className?: string;
}

/**
 * Gates analytics sections based on subscription tier.
 * Simply hides sections the user doesn't have access to.
 */
export function AnalyticsSectionGate({
  section,
  children,
}: AnalyticsSectionGateProps) {
  const { hasAccess, isLoading } = useAnalyticsSectionAccess(section);

  // While loading, show nothing to prevent layout shift
  if (isLoading) {
    return null;
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - hide section entirely
  return null;
}
