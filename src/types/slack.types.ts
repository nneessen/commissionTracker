// src/types/slack.types.ts
// TypeScript types for Slack integration

import type { Database } from "./database.types";

// Database row types
export type SlackIntegrationRow =
  Database["public"]["Tables"]["slack_integrations"]["Row"];
export type SlackIntegrationInsert =
  Database["public"]["Tables"]["slack_integrations"]["Insert"];
export type SlackIntegrationUpdate =
  Database["public"]["Tables"]["slack_integrations"]["Update"];

export type SlackChannelConfigRow =
  Database["public"]["Tables"]["slack_channel_configs"]["Row"];
export type SlackChannelConfigInsert =
  Database["public"]["Tables"]["slack_channel_configs"]["Insert"];
export type SlackChannelConfigUpdate =
  Database["public"]["Tables"]["slack_channel_configs"]["Update"];

export type SlackMessageRow =
  Database["public"]["Tables"]["slack_messages"]["Row"];
export type SlackMessageInsert =
  Database["public"]["Tables"]["slack_messages"]["Insert"];

// Enum types from database
export type SlackNotificationType =
  Database["public"]["Enums"]["slack_notification_type"];
export type SlackConnectionStatus =
  Database["public"]["Enums"]["slack_connection_status"];
export type SlackMessageStatus =
  Database["public"]["Enums"]["slack_message_status"];

// Application interfaces
export interface SlackIntegration extends SlackIntegrationRow {
  // Computed/display fields
  isConnected: boolean;
}

export interface SlackChannelConfig extends SlackChannelConfigRow {
  // Related entities for display
  agencyName?: string;
}

export interface SlackMessage extends SlackMessageRow {
  // Computed fields for display
  formattedSentAt?: string;
}

// Slack API types (from Slack's responses)
export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  is_archived: boolean;
  num_members?: number;
  purpose?: {
    value: string;
  };
  topic?: {
    value: string;
  };
}

export interface SlackTeam {
  id: string;
  name: string;
  domain?: string;
  icon?: {
    image_34?: string;
    image_44?: string;
    image_68?: string;
    image_88?: string;
    image_102?: string;
    image_132?: string;
  };
}

export interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: SlackTeam;
  authed_user: {
    id: string;
    scope: string;
    access_token?: string;
    token_type?: string;
  };
  error?: string;
}

export interface SlackOAuthState {
  imoId: string;
  userId: string;
  timestamp: number;
  returnUrl?: string;
}

// Block Kit types (simplified)
export interface SlackBlock {
  type: "header" | "section" | "divider" | "context" | "actions" | "image";
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  elements?: SlackBlockElement[];
  accessory?: SlackBlockElement;
  image_url?: string;
  alt_text?: string;
}

export interface SlackTextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
}

export interface SlackBlockElement {
  type: "button" | "image" | "mrkdwn" | "plain_text";
  text?: SlackTextObject;
  action_id?: string;
  url?: string;
  value?: string;
  image_url?: string;
  alt_text?: string;
}

// Payload for sending policy notifications
export interface PolicyNotificationPayload {
  policyId: string;
  policyNumber: string;
  carrierId: string;
  carrierName?: string;
  productId?: string;
  productName?: string;
  agentId: string;
  agentName?: string;
  agentEmail?: string;
  clientName?: string;
  annualPremium: number;
  effectiveDate: string;
  status: string;
  imoId: string;
  agencyId?: string;
}

// Leaderboard entry for ranking display
export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentEmail: string;
  totalPremium: number;
  policyCount: number;
  percentOfTotal?: number;
}

// Service response types
export interface SlackSendMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  message?: {
    text: string;
    username: string;
    bot_id: string;
    type: string;
    subtype?: string;
  };
  error?: string;
}

export interface SlackListChannelsResponse {
  ok: boolean;
  channels: SlackChannel[];
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

// Query key factory
export const slackKeys = {
  all: ["slack"] as const,
  integration: (imoId: string) =>
    [...slackKeys.all, "integration", imoId] as const,
  channels: (imoId: string) => [...slackKeys.all, "channels", imoId] as const,
  channelConfigs: (imoId: string) =>
    [...slackKeys.all, "configs", imoId] as const,
  channelConfig: (id: string) => [...slackKeys.all, "config", id] as const,
  messages: (imoId: string) => [...slackKeys.all, "messages", imoId] as const,
  message: (id: string) => [...slackKeys.all, "message", id] as const,
};
