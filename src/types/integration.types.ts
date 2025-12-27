// src/types/integration.types.ts

/**
 * Types for scheduling integrations (Calendly, Google Calendar, Zoom)
 */

// ============================================================================
// Integration Types
// ============================================================================

export type SchedulingIntegrationType =
  | "calendly"
  | "google_calendar"
  | "zoom"
  | "google_meet";

export interface SchedulingIntegration {
  id: string;
  user_id: string;
  imo_id: string | null;
  integration_type: SchedulingIntegrationType;
  display_name: string | null;
  booking_url: string;
  meeting_id: string | null;
  passcode: string | null;
  instructions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateSchedulingIntegrationInput {
  integration_type: SchedulingIntegrationType;
  display_name?: string;
  booking_url: string;
  meeting_id?: string;
  passcode?: string;
  instructions?: string;
}

export interface UpdateSchedulingIntegrationInput {
  display_name?: string;
  booking_url?: string;
  meeting_id?: string;
  passcode?: string;
  instructions?: string;
  is_active?: boolean;
}

// ============================================================================
// Checklist Item Metadata
// ============================================================================

/**
 * Metadata stored in phase_checklist_items.metadata for scheduling_booking items
 *
 * IMPORTANT: The booking_url is captured at configuration time so that recruits
 * can access it without needing to look up the admin's integrations.
 */
export interface SchedulingChecklistMetadata {
  scheduling_type: SchedulingIntegrationType;
  // The booking URL - captured from integration or custom URL at config time
  // This is the primary source of truth for the booking link
  booking_url: string;
  // Legacy field - if set, overrides booking_url (kept for backwards compatibility)
  custom_booking_url?: string;
  // Additional instructions shown to recruit
  instructions?: string;
  // Reference to a specific integration ID (for audit purposes)
  integration_id?: string;
  // Zoom-specific fields (captured at config time)
  meeting_id?: string;
  passcode?: string;
}

// ============================================================================
// Display Labels & Helpers
// ============================================================================

export const INTEGRATION_TYPE_LABELS: Record<
  SchedulingIntegrationType,
  string
> = {
  calendly: "Calendly",
  google_calendar: "Google Calendar",
  zoom: "Zoom",
  google_meet: "Google Meet",
};

export const INTEGRATION_TYPE_DESCRIPTIONS: Record<
  SchedulingIntegrationType,
  string
> = {
  calendly: "Scheduling appointments via Calendly link",
  google_calendar: "Scheduling via Google Calendar appointment link",
  zoom: "Zoom meeting link with optional passcode",
  google_meet: "Google Meet video conference link",
};

export const INTEGRATION_TYPE_PLACEHOLDERS: Record<
  SchedulingIntegrationType,
  string
> = {
  calendly: "https://calendly.com/your-username/30min",
  google_calendar: "https://calendar.google.com/calendar/appointments/...",
  zoom: "https://zoom.us/j/1234567890",
  google_meet: "https://meet.google.com/abc-defg-hij",
};

/**
 * Validate URL format for each integration type
 */
export function isValidIntegrationUrl(
  type: SchedulingIntegrationType,
  url: string,
): boolean {
  if (!url || typeof url !== "string") return false;

  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== "https:") return false;

    switch (type) {
      case "calendly":
        return parsed.hostname.includes("calendly.com");
      case "google_calendar":
        return (
          parsed.hostname.includes("calendar.google.com") ||
          parsed.hostname.includes("calendar.app.google")
        );
      case "zoom":
        return (
          parsed.hostname.includes("zoom.us") ||
          parsed.hostname.includes("zoom.com")
        );
      case "google_meet":
        return parsed.hostname.includes("meet.google.com");
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Get icon name for integration type (lucide-react icon names)
 */
export function getIntegrationIconName(
  type: SchedulingIntegrationType,
): string {
  switch (type) {
    case "calendly":
      return "Calendar";
    case "google_calendar":
      return "CalendarDays";
    case "zoom":
      return "Video";
    case "google_meet":
      return "Video";
    default:
      return "Calendar";
  }
}
