// src/features/messages/components/inbox/ThreadListItem.tsx
// Single thread row with zinc palette styling

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Paperclip, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Thread } from "../../hooks/useThreads";

interface ThreadListItemProps {
  thread: Thread;
  isSelected: boolean;
  onClick: () => void;
  isSentView?: boolean;
}

export function ThreadListItem({
  thread,
  isSelected,
  onClick,
  isSentView = false,
}: ThreadListItemProps) {
  const isUnread = thread.unreadCount > 0;
  const hasAttachments = thread.latestMessage?.hasAttachments;
  const isAutomated = thread.source === "workflow";

  // Get initials and display name based on view type
  const firstParticipant = thread.participantEmails[0] || "Unknown";
  const displayName = isSentView ? "Me" : formatParticipant(firstParticipant);
  const initials = isSentView ? "ME" : getInitials(firstParticipant);

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(thread.lastMessageAt), {
    addSuffix: false,
  });

  return (
    <button
      className={cn(
        "w-full text-left p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800/50",
        isSelected &&
          "bg-zinc-100 dark:bg-zinc-800 border-l-2 border-l-blue-500",
        isUnread && "bg-blue-50/30 dark:bg-blue-900/10",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarFallback className="text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-1 mb-0.5">
            {/* Sender name */}
            <span
              className={cn(
                "text-[11px] truncate flex-1",
                isUnread
                  ? "font-semibold text-zinc-900 dark:text-zinc-100"
                  : "font-medium text-zinc-600 dark:text-zinc-400",
              )}
            >
              {displayName}
            </span>

            {/* Indicators */}
            {thread.isStarred && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
            {hasAttachments && (
              <Paperclip className="h-3 w-3 text-zinc-400 flex-shrink-0" />
            )}
            {isAutomated && (
              <Bot className="h-3 w-3 text-zinc-400 flex-shrink-0" />
            )}

            {/* Time */}
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex-shrink-0">
              {formatTimeAgo(timeAgo)}
            </span>
          </div>

          {/* Subject */}
          <div
            className={cn(
              "text-[11px] truncate",
              isUnread
                ? "font-medium text-zinc-800 dark:text-zinc-200"
                : "text-zinc-600 dark:text-zinc-400",
            )}
          >
            {thread.subject}
          </div>

          {/* Preview */}
          <div className="text-[10px] text-zinc-500 dark:text-zinc-500 truncate mt-0.5">
            {thread.snippet}
          </div>

          {/* Labels */}
          {thread.labels && thread.labels.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {thread.labels.slice(0, 3).map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  className="h-4 px-1 text-[9px] border-zinc-300 dark:border-zinc-600"
                  style={{
                    borderColor: label.color,
                    color: label.color,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
              {thread.labels.length > 3 && (
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                  +{thread.labels.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Message count badge */}
        {thread.messageCount > 1 && (
          <Badge
            variant="secondary"
            className="h-4 min-w-[16px] px-1 text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex-shrink-0"
          >
            {thread.messageCount}
          </Badge>
        )}
      </div>
    </button>
  );
}

// Helper functions
function getInitials(email: string): string {
  const namePart = email.split("@")[0];
  const parts = namePart.split(/[._-]/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return namePart.slice(0, 2).toUpperCase();
}

function formatParticipant(email: string): string {
  const namePart = email.split("@")[0];
  const parts = namePart.split(/[._-]/);

  if (parts.length >= 2) {
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }

  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

function formatTimeAgo(timeAgo: string): string {
  return timeAgo
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" months", "mo")
    .replace(" month", "mo")
    .replace("about ", "")
    .replace("less than a minute", "now");
}
