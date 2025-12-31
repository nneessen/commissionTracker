// src/features/recruiting/pages/PublicJoinWrapper.tsx
// Wrapper component for /join-* URL pattern - stable reference for React Query

import { useLocation } from "@tanstack/react-router";
import { PublicJoinPage } from "./PublicJoinPage";

/**
 * Wrapper that handles the /join-slug URL pattern.
 * This is a stable component reference (not inline function) so React Query works correctly.
 */
export function PublicJoinWrapper() {
  const location = useLocation();

  // Only render PublicJoinPage if the path starts with /join-
  if (location.pathname.startsWith("/join-")) {
    return <PublicJoinPage />;
  }

  // Return null for non-matching paths (404 will handle it)
  return null;
}
