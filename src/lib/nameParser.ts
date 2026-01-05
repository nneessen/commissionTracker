// src/lib/nameParser.ts
// Utility for parsing display names into first/last name components

/**
 * Remove emojis and special characters from a string, keeping only
 * alphanumeric characters, spaces, hyphens, and apostrophes.
 */
function cleanNameString(str: string): string {
  // Remove emojis and most special characters, keep letters, numbers, spaces, hyphens, apostrophes
  return str
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      "",
    )
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse an Instagram display name into first and last name components.
 *
 * Instagram names are often:
 * - Display names (not real names)
 * - Single words (usernames)
 * - Multiple words
 * - Emojis or special characters
 *
 * This function does best-effort parsing:
 * - Cleans emojis and special characters
 * - Single word → first name only
 * - Multiple words → first word is first name, rest is last name
 *
 * @param displayName - The Instagram display name to parse
 * @param username - Optional username to use as fallback for first name
 * @returns Object with firstName and lastName (both may be empty strings)
 */
export function parseInstagramName(
  displayName: string | null | undefined,
  username?: string | null,
): {
  firstName: string;
  lastName: string;
} {
  // Clean and parse display name
  const cleanedName = displayName ? cleanNameString(displayName) : "";

  if (cleanedName) {
    // Split on whitespace
    const parts = cleanedName.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      // Single word - use as first name
      return { firstName: parts[0], lastName: "" };
    }

    if (parts.length > 1) {
      // Multiple words - first word is first name, rest is last name
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(" "),
      };
    }
  }

  // Fallback to username if no valid display name
  if (username) {
    // Clean the username (remove @ if present)
    const cleanUsername = username.replace(/^@/, "").trim();
    if (cleanUsername) {
      return { firstName: cleanUsername, lastName: "" };
    }
  }

  return { firstName: "", lastName: "" };
}

/**
 * Format a name for display (combines first and last with space).
 * Returns the original input if first/last are both empty.
 */
export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback?: string,
): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : fallback || "";
}
