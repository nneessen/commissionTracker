// src/features/messages/components/linkedin/LinkedInSidebar.tsx
// Sidebar component showing LinkedIn conversation list

import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Search,
  RefreshCw,
  Star,
  MessageSquare,
  X,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useLinkedInConversations,
  useSyncLinkedInConversations,
} from "@/hooks/linkedin";
import { LinkedInConversationItem } from "./LinkedInConversationItem";
import type {
  LinkedInIntegration,
  LinkedInConversation,
} from "@/types/linkedin.types";

/**
 * Skeleton loader for conversation items
 */
function ConversationSkeleton(): ReactNode {
  return (
    <div className="flex items-start gap-2 p-2">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2 w-16" />
      </div>
    </div>
  );
}

interface LinkedInSidebarProps {
  integration: LinkedInIntegration;
  selectedConversationId: string | null;
  onConversationSelect: (conversation: LinkedInConversation) => void;
}

export function LinkedInSidebar({
  integration,
  selectedConversationId,
  onConversationSelect,
}: LinkedInSidebarProps): ReactNode {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState(false);
  const hasSyncedRef = useRef<string | null>(null);

  const { data: conversations = [], isLoading } = useLinkedInConversations(
    integration.id,
    {
      isPriority: filterPriority || undefined,
    },
  );

  // Sync hook for fetching from Unipile API
  const syncConversations = useSyncLinkedInConversations();
  const isSyncing = syncConversations.isPending;

  // Auto-sync on first load (non-blocking)
  useEffect(() => {
    if (integration.id && hasSyncedRef.current !== integration.id) {
      hasSyncedRef.current = integration.id;

      // Set timeout to reset mutation if it hangs
      const timeoutId = setTimeout(() => {
        if (syncConversations.isPending) {
          syncConversations.reset();
          console.warn(
            "[LinkedInSidebar] Sync timed out after 30s, resetting state",
          );
        }
      }, 30000);

      syncConversations.mutate(
        { integrationId: integration.id },
        {
          onSettled: () => {
            clearTimeout(timeoutId);
          },
          onError: (error) => {
            console.warn("[LinkedInSidebar] Sync failed:", error);
            toast.error("Failed to sync conversations");
            // Do NOT reset hasSyncedRef here - it causes infinite retry loop
            // User can manually refresh to retry
          },
        },
      );

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration.id]);

  // Handler for manual refresh
  const handleRefresh = () => {
    syncConversations.mutate({ integrationId: integration.id });
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.participant_username?.toLowerCase().includes(query) ||
      conv.participant_name?.toLowerCase().includes(query) ||
      conv.participant_headline?.toLowerCase().includes(query) ||
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
            <Linkedin className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {integration.linkedin_display_name ||
                integration.linkedin_username ||
                "LinkedIn"}
            </span>
            {unreadCount > 0 && (
              <span className="flex-shrink-0 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-medium flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 flex-shrink-0"
            onClick={handleRefresh}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
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
        {isLoading || (isSyncing && conversations.length === 0) ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
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
                Conversations will appear when you message or receive messages
                on LinkedIn
              </p>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <LinkedInConversationItem
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
