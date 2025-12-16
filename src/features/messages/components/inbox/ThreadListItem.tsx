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
}

export function ThreadListItem({
  thread,
  isSelected,
  onClick,
}: ThreadListItemProps) {
  const isUnread = thread.unreadCount > 0;
  const hasAttachments = thread.latestMessage?.hasAttachments;
  const isAutomated = thread.source === "workflow";

  // Get initials from first participant
  const firstParticipant = thread.participantEmails[0] || "Unknown";
  const initials = getInitials(firstParticipant);

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
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarFallback className="text-[10px] bg-muted">
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
                "text-[11px] truncate flex-1",
                isUnread
                  ? "font-semibold"
                  : "font-medium text-muted-foreground",
              )}
            >
              {formatParticipant(firstParticipant)}
            </span>

            {/* Indicators */}
            {thread.isStarred && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
            {hasAttachments && (
              <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            {isAutomated && (
              <Bot className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}

            {/* Time */}
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {formatTimeAgo(timeAgo)}
            </span>
          </div>

          {/* Subject */}
          <div
            className={cn(
              "text-[11px] truncate",
              isUnread ? "font-medium" : "text-muted-foreground",
            )}
          >
            {thread.subject}
          </div>

          {/* Preview */}
          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
            {thread.snippet}
          </div>

          {/* Labels */}
          {thread.labels && thread.labels.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {thread.labels.slice(0, 3).map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  className="h-4 px-1 text-[9px]"
                  style={{
                    borderColor: label.color,
                    color: label.color,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
              {thread.labels.length > 3 && (
                <span className="text-[9px] text-muted-foreground">
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
            className="h-4 min-w-[16px] px-1 text-[9px] flex-shrink-0"
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
