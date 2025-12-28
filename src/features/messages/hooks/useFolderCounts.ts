// src/features/messages/hooks/useFolderCounts.ts
// Hook for fetching folder counts and total unread

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/base/supabase";

export interface FolderCounts {
  all: number;
  inbox: number;
  sent: number;
  starred: number;
  archived: number;
}

async function fetchFolderCounts(userId: string): Promise<FolderCounts> {
  // Get all counts in parallel for performance
  const [allResult, starredResult, archivedResult, sentResult, inboxResult] =
    await Promise.all([
      // All non-archived threads
      supabase
        .from("email_threads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_archived", false),
      // Starred threads
      supabase
        .from("email_threads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_starred", true)
        .eq("is_archived", false),
      // Archived threads
      supabase
        .from("email_threads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_archived", true),
      // Sent - get unique thread IDs with outgoing messages by this user
      // Use sender_id to identify who sent the email
      supabase
        .from("user_emails")
        .select("thread_id")
        .eq("sender_id", userId)
        .eq("is_incoming", false)
        .not("thread_id", "is", null),
      // Inbox - get unique thread IDs with incoming messages
      supabase
        .from("user_emails")
        .select("thread_id")
        .eq("user_id", userId)
        .eq("is_incoming", true)
        .not("thread_id", "is", null),
    ]);

  // Count unique thread IDs for sent and inbox
  const sentThreadIds = new Set(
    sentResult.data?.map((e) => e.thread_id).filter(Boolean) || [],
  );
  const inboxThreadIds = new Set(
    inboxResult.data?.map((e) => e.thread_id).filter(Boolean) || [],
  );

  return {
    all: allResult.count || 0,
    inbox: inboxThreadIds.size,
    sent: sentThreadIds.size,
    starred: starredResult.count || 0,
    archived: archivedResult.count || 0,
  };
}

async function fetchTotalUnread(userId: string): Promise<number> {
  const { data } = await supabase
    .from("email_threads")
    .select("unread_count")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .gt("unread_count", 0);

  return data?.reduce((sum, t) => sum + t.unread_count, 0) || 0;
}

export function useFolderCounts() {
  const { user } = useAuth();

  const { data: counts, isLoading: isLoadingCounts } = useQuery({
    queryKey: ["folderCounts", user?.id],
    queryFn: () => fetchFolderCounts(user!.id!),
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: totalUnread, isLoading: isLoadingUnread } = useQuery({
    queryKey: ["totalUnread", user?.id],
    queryFn: () => fetchTotalUnread(user!.id!),
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  return {
    counts: counts || { all: 0, inbox: 0, sent: 0, starred: 0, archived: 0 },
    totalUnread: totalUnread || 0,
    isLoading: isLoadingCounts || isLoadingUnread,
  };
}
