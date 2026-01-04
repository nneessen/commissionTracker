// src/features/messages/components/instagram/InstagramSidebar.tsx
// Instagram conversation list sidebar

import { useState, type ReactNode } from "react";
import {
  Search,
  RefreshCw,
  Loader2,
  Star,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useInstagramConversations } from "@/hooks/instagram";
import { InstagramConversationItem } from "./InstagramConversationItem";
import type {
  InstagramIntegration,
  InstagramConversation,
} from "@/types/instagram.types";

interface InstagramSidebarProps {
  integration: InstagramIntegration;
  selectedConversationId: string | null;
  onConversationSelect: (conversation: InstagramConversation) => void;
}

export function InstagramSidebar({
  integration,
  selectedConversationId,
  onConversationSelect,
}: InstagramSidebarProps): ReactNode {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState(false);

  const {
    data: conversations = [],
    isLoading,
    refetch,
    isRefetching,
  } = useInstagramConversations(integration.id, {
    isPriority: filterPriority || undefined,
  });

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.participant_username?.toLowerCase().includes(query) ||
      conv.participant_name?.toLowerCase().includes(query) ||
      conv.last_message_preview?.toLowerCase().includes(query)
    );
  });

  // Count priority conversations
  const priorityCount = conversations.filter((c) => c.is_priority).length;
  const unreadCount = conversations.reduce((acc, c) => acc + c.unread_count, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-2 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              @{integration.instagram_username}
            </span>
            {unreadCount > 0 && (
              <span className="flex-shrink-0 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-medium flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 flex-shrink-0"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={cn("h-3 w-3", isRefetching && "animate-spin")}
            />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-6 pl-7 pr-7 text-[10px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setFilterPriority(false)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
            !filterPriority
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
          )}
        >
          <MessageSquare className="h-3 w-3" />
          All
          <span className="text-[9px] font-normal opacity-70">
            {conversations.length}
          </span>
        </button>
        <button
          onClick={() => setFilterPriority(true)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
            filterPriority
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
          )}
        >
          <Star className="h-3 w-3" />
          Priority
          {priorityCount > 0 && (
            <span className="text-[9px] font-normal opacity-70">
              {priorityCount}
            </span>
          )}
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-auto p-1.5 space-y-0.5">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <MessageSquare className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {searchQuery
                ? "No conversations match your search"
                : filterPriority
                  ? "No priority conversations"
                  : "No conversations yet"}
            </p>
            {!searchQuery && !filterPriority && (
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1">
                Conversations will appear when users message your Instagram
                account
              </p>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <InstagramConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedConversationId === conversation.id}
              onClick={() => onConversationSelect(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}
