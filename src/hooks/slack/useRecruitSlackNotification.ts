// src/hooks/slack/useRecruitSlackNotification.ts
// React Query hooks for recruit Slack channel notifications

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import {
  sendRecruitNotification,
  checkNotificationSent,
  autoPostRecruitNotification,
} from "@/services/slack/recruitNotificationService";
import type { SlackBlock, SlackNotificationType } from "@/types/slack.types";
import { toast } from "sonner";

/**
 * Query whether new_recruit / npn_received notifications have been sent for a recruit
 */
export function useRecruitNotificationStatus(recruitId: string | undefined) {
  return useQuery({
    queryKey: ["slack", "recruit-notification-status", recruitId],
    queryFn: async () => {
      if (!recruitId) return { newRecruitSent: false, npnReceivedSent: false };

      const { data, error } = await supabase
        .from("slack_messages")
        .select("notification_type")
        .eq("related_entity_id", recruitId)
        .eq("related_entity_type", "recruit")
        .in("notification_type", ["new_recruit", "npn_received"])
        .in("status", ["sent", "delivered"]);

      if (error) {
        console.error("[useRecruitNotificationStatus] Error:", error);
        return { newRecruitSent: false, npnReceivedSent: false };
      }

      const types = (data || []).map((m) => m.notification_type);
      return {
        newRecruitSent: types.includes("new_recruit"),
        npnReceivedSent: types.includes("npn_received"),
      };
    },
    enabled: !!recruitId,
    staleTime: 30 * 1000,
  });
}

/**
 * Manually send a recruit Slack notification (with toast feedback)
 */
export function useSendRecruitSlackNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      integrationId: string;
      channelId: string;
      text: string;
      blocks: SlackBlock[];
      notificationType: SlackNotificationType;
      recruitId: string;
      imoId: string;
    }) => {
      // Check duplicate first
      const alreadySent = await checkNotificationSent(
        params.recruitId,
        params.notificationType,
      );
      if (alreadySent) {
        throw new Error("This notification has already been sent.");
      }

      const result = await sendRecruitNotification(params);
      if (!result.ok) {
        throw new Error(result.error || "Failed to send Slack notification");
      }
      return result;
    },
    onSuccess: (_, variables) => {
      toast.success("Slack notification sent successfully");
      queryClient.invalidateQueries({
        queryKey: ["slack", "recruit-notification-status", variables.recruitId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send Slack notification");
    },
  });
}

/**
 * Fire-and-forget auto-post mutation (no error toast, just logs)
 */
export function useAutoPostRecruitNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      recruit: {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        resident_state?: string | null;
        state?: string | null;
        npn?: string | null;
      };
      notificationType: "new_recruit" | "npn_received";
      imoId: string;
    }) => {
      await autoPostRecruitNotification(
        params.recruit,
        params.notificationType,
        params.imoId,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "slack",
          "recruit-notification-status",
          variables.recruit.id,
        ],
      });
    },
    onError: (error) => {
      // Silent failure - auto-post should not disrupt user flow
      console.error("[useAutoPostRecruitNotification] Error:", error);
    },
  });
}
