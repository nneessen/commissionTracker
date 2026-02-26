// src/features/chat-bot/hooks/useChatBot.ts
// React Query hooks for chat-bot-api edge function

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { toast } from "sonner";

// ─── Query Key Factory ──────────────────────────────────────────

export const chatBotKeys = {
  all: ["chat-bot"] as const,
  agent: () => [...chatBotKeys.all, "agent"] as const,
  conversations: (params: { page: number; limit: number; status?: string }) =>
    [...chatBotKeys.all, "conversations", params] as const,
  messages: (conversationId: string, params: { page: number; limit: number }) =>
    [...chatBotKeys.all, "messages", conversationId, params] as const,
  appointments: (params: { page: number; limit: number }) =>
    [...chatBotKeys.all, "appointments", params] as const,
  usage: () => [...chatBotKeys.all, "usage"] as const,
  closeStatus: () => [...chatBotKeys.all, "close-status"] as const,
  calendlyStatus: () => [...chatBotKeys.all, "calendly-status"] as const,
};

// ─── Types ──────────────────────────────────────────────────────

export interface ChatBotAgent {
  id: string;
  name: string;
  botEnabled: boolean;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  autoOutreachLeadSources?: string[];
  allowedLeadStatuses?: string[];
  connections?: {
    close?: { connected: boolean; orgName?: string };
    calendly?: { connected: boolean; eventType?: string };
  };
}

export interface ChatBotConversation {
  id: string;
  closeLeadId: string;
  localPhone: string | null;
  leadName: string | null;
  leadPhone: string | null;
  status: string;
  lastEventAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ChatBotMessage {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  content: string;
  createdAt: string;
}

export interface ChatBotAppointment {
  id: string;
  leadName: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
  eventUrl?: string;
}

export interface ChatBotUsage {
  leadsUsed: number;
  leadLimit: number;
  periodStart: string;
  periodEnd: string;
  tierName: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── API Helper ─────────────────────────────────────────────────

class ChatBotApiError extends Error {
  constructor(
    message: string,
    public readonly isNotProvisioned: boolean = false,
  ) {
    super(message);
    this.name = "ChatBotApiError";
  }
}

async function chatBotApi<T>(
  action: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("chat-bot-api", {
    body: { action, ...params },
  });

  if (error) {
    // For FunctionsHttpError the response body hasn't been read yet.
    // Read it from the Response object stored in error.context.
    let bodyError: string | undefined;
    const status =
      (error as { context?: Response }).context?.status ?? undefined;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        bodyError =
          typeof body?.error === "string"
            ? body.error
            : (body?.error?.message ?? undefined);
      }
    } catch {
      // body already consumed or not JSON — fall through
    }

    // Fall back to data?.error (older Supabase client behaviour) then generic message
    if (!bodyError) {
      const de = data?.error;
      bodyError =
        typeof de === "string"
          ? de
          : typeof de === "object" && de?.message
            ? de.message
            : undefined;
    }

    const msg = bodyError || error.message || "Chat bot API error";

    const isNotFound =
      status === 404 ||
      msg.includes("No active chat bot") ||
      msg.includes("not found") ||
      msg.includes("Function not found");

    console.error(`[chatBotApi] ${action} failed (status=${status}):`, msg);
    throw new ChatBotApiError(msg, isNotFound);
  }

  if (!data || data.error) {
    const errVal = data?.error;
    const msg =
      typeof errVal === "string"
        ? errVal
        : errVal?.message || "Unknown chat bot API error";
    const isNotFound =
      msg.includes("No active chat bot") || msg.includes("not found");
    console.error(`[chatBotApi] ${action} returned error in body:`, msg);
    throw new ChatBotApiError(msg, isNotFound);
  }

  return data as T;
}

// ─── Queries ────────────────────────────────────────────────────

export function useChatBotAgent(enabled = true) {
  return useQuery<ChatBotAgent | null, Error>({
    queryKey: chatBotKeys.agent(),
    queryFn: async () => {
      try {
        return await chatBotApi<ChatBotAgent>("get_agent");
      } catch (err) {
        // 404 / not provisioned / function not deployed → treat as "no addon"
        if (err instanceof ChatBotApiError && err.isNotProvisioned) {
          return null;
        }
        throw err;
      }
    },
    enabled,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      // Never retry if not provisioned or function missing
      if (error instanceof ChatBotApiError && error.isNotProvisioned)
        return false;
      return failureCount < 1;
    },
  });
}

export function useChatBotConversations(
  page: number,
  limit: number,
  status?: string,
) {
  return useQuery<PaginatedResponse<ChatBotConversation>, Error>({
    queryKey: chatBotKeys.conversations({ page, limit, status }),
    queryFn: () =>
      chatBotApi<PaginatedResponse<ChatBotConversation>>("get_conversations", {
        page,
        limit,
        status,
      }),
    staleTime: 10_000,
  });
}

export function useChatBotMessages(
  conversationId: string | null,
  page: number,
  limit: number,
) {
  return useQuery<PaginatedResponse<ChatBotMessage>, Error>({
    queryKey: chatBotKeys.messages(conversationId || "", { page, limit }),
    queryFn: () =>
      chatBotApi<PaginatedResponse<ChatBotMessage>>("get_messages", {
        conversationId,
        page,
        limit,
      }),
    enabled: !!conversationId,
    staleTime: 5_000,
  });
}

export function useChatBotAppointments(page: number, limit: number) {
  return useQuery<PaginatedResponse<ChatBotAppointment>, Error>({
    queryKey: chatBotKeys.appointments({ page, limit }),
    queryFn: () =>
      chatBotApi<PaginatedResponse<ChatBotAppointment>>("get_appointments", {
        page,
        limit,
      }),
    staleTime: 30_000,
  });
}

export function useChatBotUsage() {
  return useQuery<ChatBotUsage, Error>({
    queryKey: chatBotKeys.usage(),
    queryFn: () => chatBotApi<ChatBotUsage>("get_usage"),
    staleTime: 60_000,
  });
}

export function useChatBotCloseStatus() {
  return useQuery({
    queryKey: chatBotKeys.closeStatus(),
    queryFn: () =>
      chatBotApi<{ connected: boolean; orgName?: string }>("get_close_status"),
    staleTime: 30_000,
  });
}

export function useChatBotCalendlyStatus() {
  return useQuery({
    queryKey: chatBotKeys.calendlyStatus(),
    queryFn: () =>
      chatBotApi<{
        connected: boolean;
        eventType?: string;
        userName?: string;
        userEmail?: string;
      }>("get_calendly_status"),
    staleTime: 30_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────

export function useConnectClose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (apiKey: string) =>
      chatBotApi<{ success: boolean }>("connect_close", { apiKey }),
    onSuccess: () => {
      toast.success("Close CRM connected successfully.");
      queryClient.invalidateQueries({ queryKey: chatBotKeys.agent() });
      queryClient.invalidateQueries({ queryKey: chatBotKeys.closeStatus() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to connect Close CRM.");
    },
  });
}

export function useDisconnectClose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chatBotApi<{ success: boolean }>("disconnect_close"),
    onSuccess: () => {
      toast.success("Close CRM disconnected.");
      queryClient.invalidateQueries({ queryKey: chatBotKeys.agent() });
      queryClient.invalidateQueries({ queryKey: chatBotKeys.closeStatus() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to disconnect Close CRM.");
    },
  });
}

export function useGetCalendlyAuthUrl() {
  return useMutation({
    mutationFn: (returnUrl: string) =>
      chatBotApi<{ url: string }>("get_calendly_auth_url", { returnUrl }),
    onError: (error: Error) => {
      toast.error(error.message || "Failed to get Calendly auth URL.");
    },
  });
}

export function useDisconnectCalendly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chatBotApi<{ success: boolean }>("disconnect_calendly"),
    onSuccess: () => {
      toast.success("Calendly disconnected.");
      queryClient.invalidateQueries({ queryKey: chatBotKeys.agent() });
      queryClient.invalidateQueries({
        queryKey: chatBotKeys.calendlyStatus(),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to disconnect Calendly.");
    },
  });
}

export function useUpdateBotConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: {
      botEnabled?: boolean;
      timezone?: string;
      autoOutreachLeadSources?: string[];
      allowedLeadStatuses?: string[];
    }) => chatBotApi<{ success: boolean }>("update_config", config),
    onSuccess: () => {
      toast.success("Bot configuration updated.");
      queryClient.invalidateQueries({ queryKey: chatBotKeys.agent() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update bot configuration.");
    },
  });
}
