// src/features/messages/components/linkedin/LinkedInConversationView.tsx
// Displays LinkedIn conversation messages and message composer

import { useRef, useEffect, type ReactNode } from "react";
import { format, isSameDay } from "date-fns";
import {
  AlertCircle,
  User,
  Linkedin,
  RefreshCw,
  Briefcase,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useLinkedInMessages,
  useSetLinkedInPriority,
  useSendLinkedInMessage,
  useSyncLinkedInMessages,
} from "@/hooks/linkedin";
import type { LinkedInConversation } from "@/types/linkedin.types";
import { LinkedInMessageBubble } from "./LinkedInMessageBubble";
import { LinkedInMessageInput } from "./LinkedInMessageInput";
import { LinkedInPriorityBadge } from "./LinkedInPriorityBadge";

/**
 * Skeleton loader for message bubbles
 */
function MessageSkeleton({
  isOutbound = false,
}: {
  isOutbound?: boolean;
}): ReactNode {
  return (
    <div
      className={cn(
        "flex w-full mt-2",
        isOutbound ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn("max-w-[75%]", isOutbound ? "items-end" : "items-start")}
      >
        <Skeleton
          className={cn(
            "rounded-2xl",
            isOutbound ? "h-8 w-40 rounded-br-md" : "h-8 w-48 rounded-bl-md",
          )}
        />
        <Skeleton className="h-2 w-12 mt-1 mx-1" />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for conversation view
 */
function ConversationViewSkeleton(): ReactNode {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-16" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 overflow-auto p-3">
        <MessageSkeleton isOutbound={false} />
        <MessageSkeleton isOutbound={true} />
        <MessageSkeleton isOutbound={false} />
        <MessageSkeleton isOutbound={false} />
        <MessageSkeleton isOutbound={true} />
      </div>

      {/* Input skeleton */}
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

interface LinkedInConversationViewProps {
  /** Full conversation object from parent */
  conversation: LinkedInConversation;
  integrationId: string;
  /** When true, disables message input (e.g., session expired) */
  isSessionExpired?: boolean;
}

export function LinkedInConversationView({
  conversation: initialConversation,
  integrationId: _integrationId,
  isSessionExpired = false,
}: LinkedInConversationViewProps): ReactNode {
  const conversationId = initialConversation.id;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSyncedRef = useRef<string | null>(null);

  // Sync messages mutation
  const syncMessages = useSyncLinkedInMessages();
  const isSyncing = syncMessages.isPending;

  // Use the passed conversation directly
  const conversation = initialConversation;

  // Fetch messages from local DB
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useLinkedInMessages(conversationId);

  const messages = messagesData?.messages || [];

  // Auto-sync messages when conversation changes (non-blocking)
  useEffect(() => {
    if (conversationId && hasSyncedRef.current !== conversationId) {
      hasSyncedRef.current = conversationId;
      syncMessages.mutate(
        { conversationId },
        {
          onError: (error) => {
            console.warn("[LinkedInConversationView] Sync failed:", error);
            toast.error("Failed to sync latest messages");
          },
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Manual refresh handler
  const handleRefresh = () => {
    syncMessages.mutate({ conversationId });
  };

  // Send message using hook
  const sendMessage = useSendLinkedInMessage();

  // Priority toggle
  const setPriority = useSetLinkedInPriority();

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
    sendMessage.mutate(
      { conversationId, messageText: text },
      {
        onError: (err) => {
          toast.error(
            `Failed to send: ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        },
      },
    );
  };

  // Loading state
  if (isLoadingMessages && messages.length === 0) {
    return <ConversationViewSkeleton />;
  }

  // Error state
  if (messagesError) {
    const error = messagesError;
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
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            disabled={isSyncing}
          >
            <RefreshCw
              className={cn("h-3 w-3 mr-1.5", isSyncing && "animate-spin")}
            />
            Try Again
          </Button>
        </div>
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
          <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name and headline */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {displayName}
            </span>
            {conversation.connectionDegreeLabel && (
              <span className="flex-shrink-0 px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[8px] font-medium text-zinc-500 dark:text-zinc-400">
                {conversation.connectionDegreeLabel}
              </span>
            )}
            {conversation.hasLinkedLead && (
              <div className="flex-shrink-0 flex items-center gap-0.5 px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-[9px] text-emerald-700 dark:text-emerald-400">
                <User className="h-2.5 w-2.5" />
                Lead
              </div>
            )}
          </div>
          {conversation.participant_headline && (
            <div className="flex items-center gap-1">
              <Briefcase className="h-2.5 w-2.5 text-zinc-400" />
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                {conversation.participant_headline}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <LinkedInPriorityBadge
            isPriority={conversation.is_priority}
            prioritySetAt={conversation.priority_set_at}
            priorityNotes={conversation.priority_notes}
            onClick={handleTogglePriority}
            disabled={setPriority.isPending}
            variant="button"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Linkedin className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
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
                  <LinkedInMessageBubble
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
        <LinkedInMessageInput
          onSend={handleSendMessage}
          isSending={sendMessage.isPending}
          disabled={isSessionExpired}
          placeholder={`Message ${displayName}`}
        />
      </div>
    </div>
  );
}
