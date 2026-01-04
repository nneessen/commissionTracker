// src/features/messages/components/instagram/InstagramConversationView.tsx
// Displays Instagram conversation messages and message composer

import { useRef, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import {
  Loader2,
  AlertCircle,
  User,
  Instagram,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/services/base/supabase";
import {
  useInstagramMessages,
  useInstagramConversation,
  useSetInstagramPriority,
} from "@/hooks/instagram";
import { instagramKeys } from "@/types/instagram.types";
import { InstagramMessageBubble } from "./InstagramMessageBubble";
import { InstagramMessageInput } from "./InstagramMessageInput";
import { InstagramWindowIndicator } from "./InstagramWindowIndicator";
import { InstagramPriorityBadge } from "./InstagramPriorityBadge";
import { CreateLeadFromIGDialog } from "./CreateLeadFromIGDialog";

interface InstagramConversationViewProps {
  conversationId: string;
  integrationId: string;
}

export function InstagramConversationView({
  conversationId,
  integrationId: _integrationId,
}: InstagramConversationViewProps): ReactNode {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCreateLeadDialog, setShowCreateLeadDialog] = useState(false);

  // Fetch conversation details
  const {
    data: conversation,
    isLoading: isLoadingConversation,
    error: conversationError,
  } = useInstagramConversation(conversationId);

  // Fetch messages
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages,
    isRefetching,
  } = useInstagramMessages(conversationId);

  const messages = messagesData?.messages || [];

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase.functions.invoke(
        "instagram-send-message",
        {
          body: {
            conversationId,
            messageText: text,
          },
        },
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to send message");

      return data;
    },
    onSuccess: () => {
      // Invalidate messages to refetch
      queryClient.invalidateQueries({
        queryKey: instagramKeys.messages(conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: instagramKeys.conversation(conversationId),
      });
    },
    onError: (err) => {
      toast.error(
        `Failed to send: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    },
  });

  // Priority toggle
  const setPriority = useSetInstagramPriority();

  const handleTogglePriority = async () => {
    if (!conversation) return;

    try {
      await setPriority.mutateAsync({
        conversationId,
        isPriority: !conversation.is_priority,
      });
      toast.success(
        conversation.is_priority
          ? "Removed from priority"
          : "Added to priority",
      );
    } catch {
      toast.error("Failed to update priority");
    }
  };

  // Scroll to bottom when messages load or new message sent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendMessage = (text: string) => {
    sendMessage.mutate(text);
  };

  // Loading state
  if (isLoadingConversation || (isLoadingMessages && messages.length === 0)) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-center">
          <Loader2 className="h-6 w-6 mx-auto mb-2 text-zinc-400 animate-spin" />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Loading conversation...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (conversationError || messagesError) {
    const error = conversationError || messagesError;
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-center max-w-sm px-4">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
            Failed to load conversation
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-4">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Button
            onClick={() => refetchMessages()}
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Conversation not found
        </p>
      </div>
    );
  }

  const displayName =
    conversation.participant_name ||
    conversation.participant_username ||
    "Unknown";
  const initials = displayName.slice(0, 2).toUpperCase();

  // Group messages by date for date separators
  const messagesByDate: { date: Date; messages: typeof messages }[] = [];
  let currentDate: Date | null = null;
  let currentMessages: typeof messages = [];

  // Messages are in reverse chronological order, reverse for display
  const sortedMessages = [...messages].reverse();

  for (const message of sortedMessages) {
    // Handle null sent_at by using current date as fallback
    const messageDate = message.sent_at
      ? new Date(message.sent_at)
      : new Date();
    if (!currentDate || !isSameDay(currentDate, messageDate)) {
      if (currentMessages.length > 0) {
        messagesByDate.push({ date: currentDate!, messages: currentMessages });
      }
      currentDate = messageDate;
      currentMessages = [message];
    } else {
      currentMessages.push(message);
    }
  }
  if (currentMessages.length > 0 && currentDate) {
    messagesByDate.push({ date: currentDate, messages: currentMessages });
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Conversation header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        {/* Avatar */}
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={conversation.participant_profile_picture_url || undefined}
            alt={displayName}
          />
          <AvatarFallback className="text-[10px] bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name and username */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {conversation.participant_username
                ? `@${conversation.participant_username}`
                : displayName}
            </span>
            {conversation.hasLinkedLead && (
              <div className="flex-shrink-0 flex items-center gap-0.5 px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-[9px] text-emerald-700 dark:text-emerald-400">
                <User className="h-2.5 w-2.5" />
                Lead
              </div>
            )}
          </div>
          {conversation.participant_name &&
            conversation.participant_username && (
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                {conversation.participant_name}
              </p>
            )}
        </div>

        {/* Window indicator */}
        <InstagramWindowIndicator
          canReplyUntil={conversation.can_reply_until}
          variant="badge"
        />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <InstagramPriorityBadge
            isPriority={conversation.is_priority}
            prioritySetAt={conversation.priority_set_at}
            priorityNotes={conversation.priority_notes}
            onClick={handleTogglePriority}
            disabled={setPriority.isPending}
            variant="button"
          />
          {!conversation.hasLinkedLead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => setShowCreateLeadDialog(true)}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Create Lead
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refetchMessages()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefetching && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Instagram className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              No messages yet
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
              Start the conversation by sending a message
            </p>
          </div>
        ) : (
          <>
            {messagesByDate.map(({ date, messages: dayMessages }) => (
              <div key={date.toISOString()}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-3">
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                  <span className="px-2 text-[9px] text-zinc-400 dark:text-zinc-500">
                    {format(date, "MMMM d, yyyy")}
                  </span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                </div>

                {/* Messages for this date */}
                {dayMessages.map((message, index) => (
                  <InstagramMessageBubble
                    key={message.id}
                    message={message}
                    isGrouped={
                      index > 0 &&
                      dayMessages[index - 1].direction === message.direction
                    }
                  />
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message composer */}
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800">
        <InstagramMessageInput
          canReplyUntil={conversation.can_reply_until}
          onSend={handleSendMessage}
          isSending={sendMessage.isPending}
          placeholder={`Message @${conversation.participant_username || displayName}`}
        />
      </div>

      {/* Create Lead Dialog */}
      <CreateLeadFromIGDialog
        open={showCreateLeadDialog}
        onOpenChange={setShowCreateLeadDialog}
        conversation={conversation}
      />
    </div>
  );
}
