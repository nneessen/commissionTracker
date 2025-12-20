// src/services/activity/types.ts
import type { Database, Json } from "@/types/database.types";

// Database row types
export type ActivityLogRow =
  Database["public"]["Tables"]["user_activity_log"]["Row"];
export type ActivityLogInsert =
  Database["public"]["Tables"]["user_activity_log"]["Insert"];
export type ActivityLogUpdate =
  Database["public"]["Tables"]["user_activity_log"]["Update"];

// Entity type for application use
export interface ActivityLogEntity {
  id: string;
  userId: string;
  actionType: string;
  details: Json | null;
  performedBy: string | null;
  createdAt: string | null;
}

// Create activity log input
export interface CreateActivityLogData {
  userId: string;
  actionType: string;
  details?: Json | null;
  performedBy?: string | null;
}

// Common action types
export type ActivityActionType =
  | "recruit_created"
  | "recruit_updated"
  | "phase_advanced"
  | "phase_blocked"
  | "document_uploaded"
  | "document_approved"
  | "document_rejected"
  | "email_sent"
  | "checklist_item_completed"
  | "status_changed"
  | "note_added"
  | "call_logged"
  | "meeting_scheduled";
