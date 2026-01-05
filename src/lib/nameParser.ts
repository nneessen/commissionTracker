// src/lib/nameParser.ts
// Utility for parsing display names into first/last name components

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
 * - Single word → first name only
 * - Multiple words → first word is first name, rest is last name
 *
 * @param displayName - The Instagram display name to parse
 * @returns Object with firstName and lastName (both may be empty strings)
 */
export function parseInstagramName(displayName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  if (!displayName) {
    return { firstName: "", lastName: "" };
  }

  // Trim and normalize whitespace
  const trimmed = displayName.trim();

  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  // Split on whitespace
  const parts = trimmed.split(/\s+/);

  if (parts.length === 1) {
    // Single word - use as first name
    return { firstName: parts[0], lastName: "" };
  }

  // Multiple words - first word is first name, rest is last name
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
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
