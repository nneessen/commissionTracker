// supabase/functions/_shared/instagram-token-refresh.ts
// Shared utility for on-demand Instagram token refresh when OAuth code 190 is encountered

import { encrypt, decrypt } from "./encryption.ts";

interface RefreshResult {
  success: boolean;
  newToken?: string;
  newExpiresAt?: string;
  error?: string;
}

/**
 * Check if the token is ABOUT TO expire (within N days)
 * This enables PROACTIVE refresh BEFORE expiry - which is required because
 * Instagram tokens can ONLY be refreshed while still valid, not after expiry.
 */
export function isTokenAboutToExpire(
  tokenExpiresAt: string | null | undefined,
  daysThreshold: number = 7,
): boolean {
  if (!tokenExpiresAt) return false;

  const expiresAt = new Date(tokenExpiresAt);
  const now = new Date();
  const daysUntilExpiry =
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // Token is still valid but expires within threshold - refresh proactively
  return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold;
}

/**
 * Check if the token was recently expired (within last 24 hours)
 * This is a fallback in case the DB token_expires_at was wrong but
 * the token is actually still valid (edge case).
 * Note: Instagram typically won't allow refresh of truly expired tokens.
 */
export function isTokenRecentlyExpired(
  tokenExpiresAt: string | null | undefined,
): boolean {
  if (!tokenExpiresAt) return false;

  const expiresAt = new Date(tokenExpiresAt);
  const now = new Date();
  const hoursSinceExpiry =
    (now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60);

  // Token expired within the last 24 hours - worth attempting refresh
  return hoursSinceExpiry >= 0 && hoursSinceExpiry <= 24;
}

/**
 * Attempt to refresh an Instagram access token
 * Note: Instagram tokens can only be refreshed if they haven't fully expired
 */
export async function attemptTokenRefresh(
  currentTokenEncrypted: string,
): Promise<RefreshResult> {
  try {
    // Decrypt current token
    const currentToken = await decrypt(currentTokenEncrypted);

    // Call Instagram's token refresh endpoint
    const refreshUrl = new URL(
      "https://graph.instagram.com/refresh_access_token",
    );
    refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
    refreshUrl.searchParams.set("access_token", currentToken);

    console.log("[instagram-token-refresh] Attempting token refresh");

    const response = await fetch(refreshUrl.toString(), {
      method: "POST",
    });
    const data = await response.json();

    if (data.error || !data.access_token) {
      console.error(
        "[instagram-token-refresh] Refresh failed:",
        data.error?.message || "No access token returned",
      );
      return {
        success: false,
        error: data.error?.message || "Token refresh failed",
      };
    }

    // Calculate new expiration time
    const expiresInSeconds = data.expires_in || 5184000; // Default 60 days
    const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // Encrypt new token
    const encryptedNewToken = await encrypt(data.access_token);

    console.log(
      `[instagram-token-refresh] Token refreshed successfully, new expiry: ${newExpiresAt.toISOString()}`,
    );

    return {
      success: true,
      newToken: encryptedNewToken,
      newExpiresAt: newExpiresAt.toISOString(),
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(
      "[instagram-token-refresh] Exception during refresh:",
      errorMsg,
    );
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Update the integration in the database with the new token
 */
export async function updateIntegrationToken(
  supabase: ReturnType<
    typeof import("https://esm.sh/@supabase/supabase-js@2.38.0").createClient
  >,
  integrationId: string,
  newTokenEncrypted: string,
  newExpiresAt: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("instagram_integrations")
    .update({
      access_token_encrypted: newTokenEncrypted,
      token_expires_at: newExpiresAt,
      last_refresh_at: new Date().toISOString(),
      connection_status: "connected",
      last_error: null,
      last_error_at: null,
    })
    .eq("id", integrationId);

  if (error) {
    console.error(
      "[instagram-token-refresh] Failed to update token in DB:",
      error,
    );
    return false;
  }

  return true;
}

/**
 * Mark the integration as expired in the database
 */
export async function markIntegrationExpired(
  supabase: ReturnType<
    typeof import("https://esm.sh/@supabase/supabase-js@2.38.0").createClient
  >,
  integrationId: string,
  errorMessage: string,
): Promise<void> {
  await supabase
    .from("instagram_integrations")
    .update({
      connection_status: "expired",
      last_error: errorMessage,
      last_error_at: new Date().toISOString(),
    })
    .eq("id", integrationId);
}
