// src/services/slack/recruitNotificationService.ts
// Service for sending recruit-related Slack notifications to the #new-agent-testing-odette channel

import { supabase } from "@/services/base/supabase";
import { slackService } from "./slackService";
import type {
  SlackIntegration,
  SlackChannel,
  SlackBlock,
  SlackNotificationType,
} from "@/types/slack.types";

const SELF_MADE_WORKSPACE_PATTERN = /self made/i;
const RECRUIT_CHANNEL_NAME = "new-agent-testing-odette";

/**
 * Find the "Self Made" workspace integration from a list of integrations
 */
export function findSelfMadeIntegration(
  integrations: SlackIntegration[],
): SlackIntegration | null {
  return (
    integrations.find(
      (i) =>
        i.isConnected &&
        i.team_name &&
        SELF_MADE_WORKSPACE_PATTERN.test(i.team_name),
    ) ?? null
  );
}

/**
 * Find the recruit notification channel from a list of channels
 */
export function findRecruitChannel(
  channels: SlackChannel[],
): SlackChannel | null {
  return (
    channels.find((c) => c.name === RECRUIT_CHANNEL_NAME && !c.is_archived) ??
    null
  );
}

/**
 * Build Block Kit payload for a new recruit notification
 */
export function buildNewRecruitMessage(recruit: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  resident_state?: string | null;
  upline_name?: string | null;
}): { text: string; blocks: SlackBlock[] } {
  const fullName =
    `${recruit.first_name || ""} ${recruit.last_name || ""}`.trim() ||
    "Unknown";
  const text = `New Recruit: ${fullName}`;

  const detailLines = [
    `*Name:*  ${fullName}`,
    `*Email:*  ${recruit.email || "N/A"}`,
  ];
  if (recruit.resident_state) {
    detailLines.push(`*State:*  ${recruit.resident_state}`);
  }
  if (recruit.upline_name) {
    detailLines.push(`*Upline:*  ${recruit.upline_name}`);
  }

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:new: *New Recruit Added*\n\n${detailLines.join("\n")}`,
      },
    },
    { type: "divider" },
  ];

  return { text, blocks };
}

/**
 * Build Block Kit payload for NPN received notification
 */
export function buildNpnReceivedMessage(recruit: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  npn?: string | null;
  resident_state?: string | null;
  upline_name?: string | null;
}): { text: string; blocks: SlackBlock[] } {
  const fullName =
    `${recruit.first_name || ""} ${recruit.last_name || ""}`.trim() ||
    "Unknown";
  const text = `NPN Received: ${fullName}`;

  const detailLines = [
    `*Name:*  ${fullName}`,
    `*Email:*  ${recruit.email || "N/A"}`,
    `*NPN:*  ${recruit.npn || "N/A"}`,
  ];
  if (recruit.resident_state) {
    detailLines.push(`*State:*  ${recruit.resident_state}`);
  }
  if (recruit.upline_name) {
    detailLines.push(`*Upline:*  ${recruit.upline_name}`);
  }

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:white_check_mark: *NPN Received — Please send email #2*\n\n${detailLines.join("\n")}`,
      },
    },
    { type: "divider" },
  ];

  return { text, blocks };
}

/**
 * Check if a notification of the given type has already been sent for a recruit
 */
export async function checkNotificationSent(
  recruitId: string,
  notificationType: SlackNotificationType,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("slack_messages")
    .select("id")
    .eq("related_entity_id", recruitId)
    .eq("related_entity_type", "recruit")
    .eq("notification_type", notificationType)
    .in("status", ["sent", "delivered"])
    .limit(1);

  if (error) {
    console.error(
      "[recruitNotificationService] checkNotificationSent error:",
      error,
    );
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Send a recruit notification via the slack-send-message edge function
 */
export async function sendRecruitNotification(params: {
  integrationId: string;
  channelId: string;
  text: string;
  blocks: SlackBlock[];
  notificationType: SlackNotificationType;
  recruitId: string;
  imoId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke(
    "slack-send-message",
    {
      body: {
        integrationId: params.integrationId,
        channelId: params.channelId,
        text: params.text,
        blocks: params.blocks,
        notificationType: params.notificationType,
        relatedEntityType: "recruit",
        relatedEntityId: params.recruitId,
        imoId: params.imoId,
      },
    },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return data;
}

/**
 * Full auto-post flow: find integration, find channel, join channel, check duplicates, send.
 * Fails silently (logs errors, never throws).
 */
export async function autoPostRecruitNotification(
  recruit: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    resident_state?: string | null;
    npn?: string | null;
    upline_name?: string | null;
  },
  notificationType: "new_recruit" | "npn_received",
  imoId: string,
): Promise<void> {
  try {
    // Get all integrations for the IMO
    const integrations = await slackService.getIntegrations(imoId);
    const selfMade = findSelfMadeIntegration(integrations);
    if (!selfMade) {
      console.log(
        "[recruitNotificationService] No Self Made integration found, skipping auto-post",
      );
      return;
    }

    // Check duplicate
    const alreadySent = await checkNotificationSent(
      recruit.id,
      notificationType,
    );
    if (alreadySent) {
      console.log(
        `[recruitNotificationService] ${notificationType} already sent for recruit ${recruit.id}, skipping`,
      );
      return;
    }

    // Build message
    // Pass channel name directly to Slack API (it accepts names, not just IDs)
    // This avoids calling slack-list-channels edge function which has CORS restrictions
    const message =
      notificationType === "new_recruit"
        ? buildNewRecruitMessage(recruit)
        : buildNpnReceivedMessage(recruit);

    // Send using channel name directly (Slack API resolves names)
    const result = await sendRecruitNotification({
      integrationId: selfMade.id,
      channelId: RECRUIT_CHANNEL_NAME,
      text: message.text,
      blocks: message.blocks,
      notificationType,
      recruitId: recruit.id,
      imoId,
    });

    if (!result.ok) {
      console.error(
        "[recruitNotificationService] Auto-post failed:",
        result.error,
      );
    }
  } catch (err) {
    console.error("[recruitNotificationService] Auto-post error:", err);
  }
}
