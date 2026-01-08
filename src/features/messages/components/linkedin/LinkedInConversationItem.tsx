// src/features/messages/components/linkedin/LinkedInConversationItem.tsx
// Single conversation row in the LinkedIn sidebar

import { type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Star, User, Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { LinkedInConversation } from "@/types/linkedin.types";

interface LinkedInConversationItemProps {
  conversation: LinkedInConversation;
  isSelected: boolean;
  onClick: () => void;
}

export function LinkedInConversationItem({
  conversation,
  isSelected,
  onClick,
}: LinkedInConversationItemProps): ReactNode {
  const displayName =
    conversation.participant_name ||
    conversation.participant_username ||
    "Unknown";
  const initials = displayName.slice(0, 2).toUpperCase();

  const lastMessageTime = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), {
        addSuffix: true,
      })
    : null;

  const hasUnread = conversation.unread_count > 0;
  const isInbound = conversation.last_message_direction === "inbound";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-2 p-2 rounded-md text-left transition-colors",
        isSelected
          ? "bg-blue-100 dark:bg-blue-900/30"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={conversation.participant_profile_picture_url ?? undefined}
            alt={displayName}
          />
          <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Connection degree badge */}
        {conversation.connectionDegreeLabel && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
            <span className="text-[7px] font-medium text-zinc-600 dark:text-zinc-300">
              {conversation.connectionDegreeLabel}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-1">
          {/* Name */}
          <span
            className={cn(
              "text-[11px] truncate flex-1",
              hasUnread
                ? "font-semibold text-zinc-900 dark:text-zinc-100"
                : "font-medium text-zinc-700 dark:text-zinc-300",
            )}
          >
            {displayName}
          </span>

          {/* Priority star */}
          {conversation.is_priority && (
            <Star className="h-3 w-3 flex-shrink-0 text-amber-500 fill-amber-500" />
          )}

          {/* Linked lead badge */}
          {conversation.hasLinkedLead && (
            <div className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <User className="h-2 w-2 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
        </div>

        {/* Headline row */}
        {conversation.participant_headline && (
          <div className="flex items-center gap-1 mt-0.5">
            <Briefcase className="h-2.5 w-2.5 text-zinc-400 flex-shrink-0" />
            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate">
              {conversation.participant_headline}
            </p>
          </div>
        )}

        {/* Message preview row */}
        <div className="flex items-center gap-1 mt-0.5">
          <p
            className={cn(
              "text-[10px] truncate flex-1",
              hasUnread
                ? "text-zinc-700 dark:text-zinc-300"
                : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            {isInbound ? "" : "You: "}
            {conversation.last_message_preview || "No messages yet"}
          </p>
        </div>

        {/* Time and unread badge row */}
        <div className="flex items-center justify-between mt-0.5">
          {lastMessageTime && (
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
              {lastMessageTime}
            </span>
          )}
          {hasUnread && (
            <span className="ml-auto flex-shrink-0 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-medium flex items-center justify-center">
              {conversation.unread_count > 99
                ? "99+"
                : conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
