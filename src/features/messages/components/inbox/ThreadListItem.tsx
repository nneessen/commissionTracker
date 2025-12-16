// src/features/messages/components/inbox/ThreadListItem.tsx
// Single thread row in the list

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
  // In sent view, show "Me" as sender; otherwise show participant name
  const displayName = isSentView ? "Me" : formatParticipant(firstParticipant);
  const initials = isSentView ? "ME" : getInitials(firstParticipant);

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(thread.lastMessageAt), {
    addSuffix: false,
  });

  return (
    <button
      className={cn(
        "w-full text-left p-2.5 hover:bg-muted/50 transition-colors",
        isSelected && "bg-primary/5 border-l-2 border-l-primary",
        isUnread && "bg-primary/[0.02]",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-1.5 mb-0.5">
            {/* Sender name */}
            <span
              className={cn(
                "text-sm truncate flex-1",
                isUnread
                  ? "font-semibold"
                  : "font-medium text-muted-foreground",
              )}
            >
              {displayName}
            </span>

            {/* Indicators */}
            {thread.isStarred && (
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
            {hasAttachments && (
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
            {isAutomated && (
              <Bot className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}

            {/* Time */}
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTimeAgo(timeAgo)}
            </span>
          </div>

          {/* Subject */}
          <div
            className={cn(
              "text-sm truncate",
              isUnread ? "font-medium" : "text-muted-foreground",
            )}
          >
            {thread.subject}
          </div>

          {/* Preview */}
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {thread.snippet}
          </div>

          {/* Labels */}
          {thread.labels && thread.labels.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {thread.labels.slice(0, 3).map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  className="h-5 px-1.5 text-xs"
                  style={{
                    borderColor: label.color,
                    color: label.color,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
              {thread.labels.length > 3 && (
                <span className="text-xs text-muted-foreground">
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
            className="h-5 min-w-[18px] px-1.5 text-xs flex-shrink-0"
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
  // Try to extract name from email
  const namePart = email.split("@")[0];
  const parts = namePart.split(/[._-]/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return namePart.slice(0, 2).toUpperCase();
}

function formatParticipant(email: string): string {
  // Try to make email more readable
  const namePart = email.split("@")[0];
  const parts = namePart.split(/[._-]/);

  if (parts.length >= 2) {
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }

  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

function formatTimeAgo(timeAgo: string): string {
  // Shorten time strings
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
