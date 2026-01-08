// src/features/messages/components/linkedin/LinkedInMessageBubble.tsx
// Single message display in a LinkedIn conversation thread

import { type ReactNode } from "react";
import { format } from "date-fns";
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Image,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LinkedInMessage } from "@/types/linkedin.types";

interface LinkedInMessageBubbleProps {
  message: LinkedInMessage;
  showAvatar?: boolean;
  isGrouped?: boolean;
}

export function LinkedInMessageBubble({
  message,
  showAvatar: _showAvatar = false,
  isGrouped = false,
}: LinkedInMessageBubbleProps): ReactNode {
  const isOutbound = message.direction === "outbound";
  const timestamp = message.sent_at ? new Date(message.sent_at) : null;

  const getStatusIcon = () => {
    switch (message.status) {
      case "pending":
        return <Clock className="h-2.5 w-2.5 text-zinc-400" />;
      case "sent":
        return <Check className="h-2.5 w-2.5 text-zinc-400" />;
      case "delivered":
        return <CheckCheck className="h-2.5 w-2.5 text-zinc-400" />;
      case "read":
        return <CheckCheck className="h-2.5 w-2.5 text-blue-500" />;
      case "failed":
        return <AlertCircle className="h-2.5 w-2.5 text-red-500" />;
      default:
        return null;
    }
  };

  const getMessageTypeIcon = () => {
    switch (message.message_type) {
      case "media":
        return <Image className="h-3 w-3" />;
      case "inmail":
        return <FileText className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // InMail indicator
  const inmailIndicator =
    message.message_type === "inmail" ? (
      <div className="flex items-center gap-1 text-[9px] text-zinc-400 dark:text-zinc-500 mb-1">
        <FileText className="h-2.5 w-2.5" />
        <span>InMail</span>
      </div>
    ) : null;

  // Media content
  const mediaContent = message.media_url ? (
    <div className="mb-1 rounded overflow-hidden max-w-[200px]">
      <img
        src={message.media_url}
        alt="Shared media"
        className="w-full max-h-[200px] object-contain bg-zinc-100 dark:bg-zinc-800"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "flex w-full",
        isOutbound ? "justify-end" : "justify-start",
        isGrouped ? "mt-0.5" : "mt-2",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] min-w-[60px]",
          isOutbound ? "items-end" : "items-start",
        )}
      >
        {/* Sender name for inbound messages (non-grouped) */}
        {!isOutbound && !isGrouped && message.sender_name && (
          <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mb-0.5 px-1">
            {message.sender_name}
          </p>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "px-2.5 py-1.5 rounded-2xl",
            isOutbound
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md",
          )}
        >
          {inmailIndicator}
          {mediaContent}

          {/* Message text */}
          {message.message_text && (
            <p className="text-[11px] whitespace-pre-wrap break-words leading-relaxed">
              {message.message_text}
            </p>
          )}

          {/* Empty message placeholder */}
          {!message.message_text && !message.media_url && (
            <div className="flex items-center gap-1 text-[10px] opacity-70">
              {getMessageTypeIcon()}
              <span>
                {message.message_type === "media"
                  ? "Shared media"
                  : "Unsupported message"}
              </span>
            </div>
          )}
        </div>

        {/* Timestamp and status row */}
        <div
          className={cn(
            "flex items-center gap-1 mt-0.5 px-1",
            isOutbound ? "justify-end" : "justify-start",
          )}
        >
          {timestamp && (
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
              {format(timestamp, "h:mm a")}
            </span>
          )}
          {isOutbound && getStatusIcon()}
        </div>
      </div>
    </div>
  );
}

// Grouped messages helper - groups consecutive messages from same sender
export function groupMessages(
  messages: LinkedInMessage[],
): LinkedInMessage[][] {
  const groups: LinkedInMessage[][] = [];
  let currentGroup: LinkedInMessage[] = [];

  for (const message of messages) {
    if (currentGroup.length === 0) {
      currentGroup.push(message);
    } else {
      const lastMessage = currentGroup[currentGroup.length - 1];
      const sameDirection = lastMessage.direction === message.direction;
      const timeDiff = Math.abs(
        new Date(message.sent_at).getTime() -
          new Date(lastMessage.sent_at).getTime(),
      );
      const withinTimeWindow = timeDiff < 60000; // 1 minute

      if (sameDirection && withinTimeWindow) {
        currentGroup.push(message);
      } else {
        groups.push(currentGroup);
        currentGroup = [message];
      }
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
