// src/features/messages/components/inbox/ThreadList.tsx
// List of email threads with virtual scrolling

import { useThreads } from "../../hooks/useThreads";
import { ThreadListItem } from "./ThreadListItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, Search } from "lucide-react";

interface ThreadListProps {
  labelId: string | null;
  searchQuery: string;
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  filter: "inbox" | "sent" | "drafts" | "scheduled" | "archived";
}

export function ThreadList({
  labelId,
  searchQuery,
  selectedThreadId,
  onThreadSelect,
  filter,
}: ThreadListProps) {
  const { threads, isLoading, error } = useThreads({
    labelId: labelId || undefined,
    search: searchQuery || undefined,
    filter,
  });

  if (isLoading) {
    return <ThreadListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground">
        <p className="text-sm">Failed to load messages</p>
        <p className="text-[10px] mt-1">{error.message}</p>
      </div>
    );
  }

  if (!threads || threads.length === 0) {
    return (
      <EmptyState
        filter={filter}
        hasSearch={!!searchQuery}
        hasLabel={!!labelId}
      />
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-border">
        {threads.map((thread) => (
          <ThreadListItem
            key={thread.id}
            thread={thread}
            isSelected={selectedThreadId === thread.id}
            onClick={() => onThreadSelect(thread.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function ThreadListSkeleton() {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="p-2 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  filter: string;
  hasSearch: boolean;
  hasLabel: boolean;
}

function EmptyState({ filter, hasSearch, hasLabel }: EmptyStateProps) {
  if (hasSearch) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground">
        <Search className="h-8 w-8 mb-3 opacity-20" />
        <p className="text-sm">No messages found</p>
        <p className="text-[10px] mt-1">Try a different search term</p>
      </div>
    );
  }

  if (hasLabel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground">
        <Inbox className="h-8 w-8 mb-3 opacity-20" />
        <p className="text-sm">No messages with this label</p>
      </div>
    );
  }

  const messages: Record<string, { title: string; subtitle: string }> = {
    inbox: {
      title: "Your inbox is empty",
      subtitle: "Messages you receive will appear here",
    },
    sent: {
      title: "No sent messages",
      subtitle: "Messages you send will appear here",
    },
    drafts: {
      title: "No drafts",
      subtitle: "Unsent messages will be saved here",
    },
    scheduled: {
      title: "No scheduled messages",
      subtitle: "Schedule emails to send later",
    },
    archived: {
      title: "No archived messages",
      subtitle: "Archive messages to clean up your inbox",
    },
  };

  const { title, subtitle } = messages[filter] || messages.inbox;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground">
      <Inbox className="h-8 w-8 mb-3 opacity-20" />
      <p className="text-sm">{title}</p>
      <p className="text-[10px] mt-1">{subtitle}</p>
    </div>
  );
}
