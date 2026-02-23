/**
 * Audit Formatters
 * Phase 11: Audit Trail & Activity Logs
 * Utility functions for formatting audit data
 */

// eslint-disable-next-line no-restricted-imports
import {
  ACTION_TYPE_LABELS,
  TABLE_NAME_LABELS,
  type AuditAction,
} from "@/services/audit";

/**
 * Format action type for display
 */
export function formatActionType(actionType: string | null): string {
  if (!actionType) return "Unknown";
  return ACTION_TYPE_LABELS[actionType] || formatSnakeCase(actionType);
}

/**
 * Format table name for display
 */
export function formatTableName(tableName: string): string {
  return TABLE_NAME_LABELS[tableName] || formatSnakeCase(tableName);
}

/**
 * Format snake_case to Title Case
 */
export function formatSnakeCase(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format action for display
 */
export function formatAction(action: AuditAction): string {
  switch (action) {
    case "INSERT":
      return "Created";
    case "UPDATE":
      return "Updated";
    case "DELETE":
      return "Deleted";
    default:
      return action;
  }
}

/**
 * Get action icon name
 */
export function getActionIcon(action: AuditAction): string {
  switch (action) {
    case "INSERT":
      return "Plus";
    case "UPDATE":
      return "Pencil";
    case "DELETE":
      return "Trash2";
    default:
      return "Activity";
  }
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return "Just now";
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else if (diffDay < 7) {
    return `${diffDay}d ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

/**
 * Format date for display
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format changed fields for display
 */
export function formatChangedFields(fields: string[] | null): string {
  if (!fields || fields.length === 0) return "-";
  if (fields.length <= 3) {
    return fields.map(formatSnakeCase).join(", ");
  }
  return `${fields.slice(0, 2).map(formatSnakeCase).join(", ")} +${fields.length - 2} more`;
}

/**
 * Format performer name
 */
export function formatPerformer(
  name: string | null,
  email: string | null,
): string {
  if (name) return name;
  if (email) return email.split("@")[0];
  return "System";
}
