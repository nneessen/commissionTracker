// src/lib/instagram/selectors.ts
// UI selectors for Instagram computed values
// These are computed at render time, not stored in DB or fetched from API
// Keeps DB transforms clean and ensures values are always current

export type WindowStatus = "open" | "closing_soon" | "closed";

/**
 * Calculate the messaging window status from can_reply_until timestamp
 * - "open": Window is open, > 2 hours remaining
 * - "closing_soon": Window is open, < 2 hours remaining (amber warning)
 * - "closed": Window is closed, cannot send messages
 */
export function selectWindowStatus(canReplyUntil: string | null): WindowStatus {
  if (!canReplyUntil) return "closed";

  const expiresAt = new Date(canReplyUntil).getTime();
  const now = Date.now();
  const remainingMs = expiresAt - now;

  if (remainingMs <= 0) return "closed";
  if (remainingMs < 2 * 60 * 60 * 1000) return "closing_soon"; // < 2 hours
  return "open";
}

/**
 * Calculate time remaining in milliseconds until window closes
 * Returns null if window is already closed
 */
export function selectWindowTimeRemaining(
  canReplyUntil: string | null,
): number | null {
  if (!canReplyUntil) return null;

  const expiresAt = new Date(canReplyUntil).getTime();
  const now = Date.now();
  const remainingMs = expiresAt - now;

  return remainingMs > 0 ? remainingMs : null;
}

/**
 * Format time remaining as human-readable string
 * e.g., "23h 45m", "1h 30m", "45m", "< 1m"
 */
export function formatTimeRemaining(milliseconds: number | null): string {
  if (milliseconds === null || milliseconds <= 0) return "Closed";

  const totalMinutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "< 1m";
}

/**
 * Determine if a message is outbound (sent by the integration owner)
 */
export function selectIsOutbound(
  direction: "inbound" | "outbound" | null,
): boolean {
  return direction === "outbound";
}

/**
 * Format a timestamp for display in message bubbles
 */
export function formatMessageTime(sentAt: string | null): string {
  if (!sentAt) return "";

  const date = new Date(sentAt);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // For older messages, show date + time
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Get display name for a conversation participant
 * Prefers name, falls back to username, then ID
 */
export function selectDisplayName(
  name: string | null,
  username: string | null,
  participantId: string | null,
): string {
  if (name && name.trim()) return name;
  if (username && username.trim()) return username;
  if (participantId) return `User ${participantId.substring(0, 8)}`;
  return "Unknown";
}

/**
 * Get initials for avatar fallback
 */
export function selectInitials(displayName: string): string {
  return displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Determine the best avatar URL to use
 * Prefers cached URL, falls back to original (which may 403)
 */
export function selectAvatarUrl(
  cachedUrl: string | null,
  originalUrl: string | null,
): string | null {
  return cachedUrl || originalUrl || null;
}

/**
 * Determine the best media URL to use
 * Prefers cached URL, falls back to original
 */
export function selectMediaUrl(
  cachedUrl: string | null,
  originalUrl: string | null,
): string | null {
  return cachedUrl || originalUrl || null;
}
