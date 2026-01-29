// src/lib/string.ts
// String manipulation utilities

/**
 * Extract initials from a name string
 * Returns up to 2 uppercase initials from the first letters of each word
 *
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials("Alice") // "A"
 * getInitials("Mary Jane Watson") // "MJ"
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Extract initials from an email address
 * Parses the local part (before @) and extracts initials from segments
 * separated by dots, underscores, or hyphens
 *
 * @example
 * getInitialsFromEmail("john.doe@example.com") // "JD"
 * getInitialsFromEmail("jane_smith@example.com") // "JS"
 * getInitialsFromEmail("alice@example.com") // "AL"
 */
export function getInitialsFromEmail(email: string): string {
  const namePart = email.split('@')[0];
  const parts = namePart.split(/[._-]/);

  if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return namePart.slice(0, 2).toUpperCase();
}
