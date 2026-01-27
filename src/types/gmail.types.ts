// src/types/gmail.types.ts
// Type definitions for Gmail OAuth integration

export type GmailConnectionStatus =
  | "connected"
  | "disconnected"
  | "expired"
  | "error";

export interface GmailIntegration {
  id: string;
  user_id: string;
  gmail_address: string;
  gmail_user_id: string;
  gmail_name: string | null;
  gmail_picture_url: string | null;
  token_expires_at: string;
  last_refresh_at: string | null;
  scopes: string[];
  connection_status: GmailConnectionStatus;
  is_active: boolean;
  last_connected_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  history_id: string | null;
  last_synced_at: string | null;
  last_full_sync_at: string | null;
  api_calls_today: number;
  api_calls_reset_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GmailSyncLog {
  id: string;
  integration_id: string;
  sync_type: "full" | "incremental" | "send";
  messages_synced: number;
  messages_failed: number;
  status: "success" | "partial" | "failed";
  error_message: string | null;
  duration_ms: number | null;
  history_id_before: string | null;
  history_id_after: string | null;
  created_at: string;
}

// Query keys for TanStack Query
export const gmailKeys = {
  all: ["gmail"] as const,
  integration: (userId: string) =>
    [...gmailKeys.all, "integration", userId] as const,
  syncLogs: (integrationId: string) =>
    [...gmailKeys.all, "sync-logs", integrationId] as const,
};
