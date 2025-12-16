// src/features/messages/services/threadService.ts
// Service for managing email threads

import { supabase } from "@/services/base/supabase";

export interface Thread {
  id: string;
  subject: string;
  snippet: string;
  messageCount: number;
  unreadCount: number;
  lastMessageAt: string;
  participantEmails: string[];
  isStarred: boolean;
  isArchived: boolean;
  labels: ThreadLabel[];
  latestMessage?: {
    id: string;
    bodyText: string;
    hasAttachments: boolean;
  };
  source?: string;
}

export interface ThreadLabel {
  id: string;
  name: string;
  color: string;
}

export interface Message {
  id: string;
  threadId: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  createdAt: string;
  isIncoming: boolean;
  isRead: boolean;
  hasAttachments: boolean;
  attachments?: { name: string; size: number; url?: string }[];
  source?: string;
  openCount?: number;
  clickCount?: number;
}

export interface ThreadFilters {
  search?: string;
  filter?:
    | "all"
    | "inbox"
    | "sent"
    | "starred"
    | "drafts"
    | "scheduled"
    | "archived";
  userId: string;
}

export async function getThreads(filters: ThreadFilters): Promise<Thread[]> {
  const { userId, search, filter = "inbox" } = filters;

  // For "inbox" filter, only show threads with incoming messages
  if (filter === "inbox") {
    // Get thread IDs with incoming messages
    const { data: inboxThreadIds, error: inboxError } = await supabase
      .from("user_emails")
      .select("thread_id")
      .eq("user_id", userId)
      .eq("is_incoming", true)
      .not("thread_id", "is", null);

    if (inboxError) {
      console.error("Error fetching inbox thread IDs:", inboxError);
      throw inboxError;
    }

    if (!inboxThreadIds || inboxThreadIds.length === 0) {
      return [];
    }

    // Filter to only valid UUIDs
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validThreadIds = inboxThreadIds
      .map((t) => t.thread_id)
      .filter(
        (id): id is string => typeof id === "string" && uuidPattern.test(id),
      );

    const uniqueThreadIds = [...new Set(validThreadIds)];

    if (uniqueThreadIds.length === 0) {
      return [];
    }

    // Now get those threads
    let query = supabase
      .from("email_threads")
      .select(
        `
        id,
        subject,
        snippet,
        message_count,
        unread_count,
        last_message_at,
        participant_emails,
        is_starred,
        is_archived,
        labels
      `,
      )
      .eq("user_id", userId)
      .in("id", uniqueThreadIds)
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false });

    // Apply search
    if (search) {
      query = query.or(`subject.ilike.%${search}%,snippet.ilike.%${search}%`);
    }

    const { data: threads, error } = await query.limit(50);

    if (error) {
      console.error("Error fetching inbox threads:", error);
      throw error;
    }

    return transformThreads(threads || [], userId);
  }

  // For "sent" filter, we need to get thread IDs that have outgoing messages first
  if (filter === "sent") {
    // Get thread IDs with outgoing messages
    const { data: sentThreadIds, error: sentError } = await supabase
      .from("user_emails")
      .select("thread_id")
      .eq("user_id", userId)
      .eq("is_incoming", false)
      .not("thread_id", "is", null);

    if (sentError) {
      console.error("Error fetching sent thread IDs:", sentError);
      throw sentError;
    }

    if (!sentThreadIds || sentThreadIds.length === 0) {
      return [];
    }

    // Filter to only valid UUIDs (36 chars with hyphens pattern)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validThreadIds = sentThreadIds
      .map((t) => t.thread_id)
      .filter(
        (id): id is string => typeof id === "string" && uuidPattern.test(id),
      );

    const uniqueThreadIds = [...new Set(validThreadIds)];

    if (uniqueThreadIds.length === 0) {
      return [];
    }

    // Now get those threads
    let query = supabase
      .from("email_threads")
      .select(
        `
        id,
        subject,
        snippet,
        message_count,
        unread_count,
        last_message_at,
        participant_emails,
        is_starred,
        is_archived,
        labels
      `,
      )
      .eq("user_id", userId)
      .in("id", uniqueThreadIds)
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false });

    // Apply search
    if (search) {
      query = query.or(`subject.ilike.%${search}%,snippet.ilike.%${search}%`);
    }

    const { data: threads, error } = await query.limit(50);

    if (error) {
      console.error("Error fetching sent threads:", error);
      throw error;
    }

    return transformThreads(threads || [], userId);
  }

  // Build query for threads (non-sent filters)
  let query = supabase
    .from("email_threads")
    .select(
      `
      id,
      subject,
      snippet,
      message_count,
      unread_count,
      last_message_at,
      participant_emails,
      is_starred,
      is_archived,
      labels
    `,
    )
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  // Apply filter (inbox and sent are handled above)
  switch (filter) {
    case "all":
      // All non-archived messages
      query = query.eq("is_archived", false);
      break;
    case "starred":
      query = query.eq("is_starred", true).eq("is_archived", false);
      break;
    case "archived":
      query = query.eq("is_archived", true);
      break;
  }

  // Apply search
  if (search) {
    query = query.or(`subject.ilike.%${search}%,snippet.ilike.%${search}%`);
  }

  const { data: threads, error } = await query.limit(50);

  if (error) {
    console.error("Error fetching threads:", error);
    throw error;
  }

  return transformThreads(threads || [], userId);
}

// Helper function to transform thread data
async function transformThreads(
  threads: Record<string, unknown>[],
  userId: string,
): Promise<Thread[]> {
  if (threads.length === 0) return [];

  // Get labels for color mapping
  const { data: allLabels } = await supabase
    .from("email_labels")
    .select("id, name, color")
    .eq("user_id", userId);

  const labelMap = new Map(
    allLabels?.map((l: { id: string; name: string; color: string }) => [
      l.id,
      l,
    ]) || [],
  );

  // Transform to Thread interface
  return threads.map((t: Record<string, unknown>) => ({
    id: t.id as string,
    subject: (t.subject as string) || "(No Subject)",
    snippet: (t.snippet as string) || "",
    messageCount: (t.message_count as number) || 1,
    unreadCount: (t.unread_count as number) || 0,
    lastMessageAt: t.last_message_at as string,
    participantEmails: (t.participant_emails as string[]) || [],
    isStarred: (t.is_starred as boolean) || false,
    isArchived: (t.is_archived as boolean) || false,
    labels: ((t.labels as string[]) || [])
      .map((labelId: string) => labelMap.get(labelId))
      .filter(Boolean) as ThreadLabel[],
    source: undefined,
  }));
}

export interface GetThreadOptions {
  threadId: string;
  userId: string;
  // Pagination: fetch latest N messages initially
  limit?: number;
  // Offset for loading earlier messages
  offset?: number;
}

export interface ThreadWithMessages {
  thread: Thread;
  messages: Message[];
  totalMessages: number;
  hasMore: boolean;
}

export async function getThread(
  threadId: string,
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<ThreadWithMessages | null> {
  const limit = options?.limit ?? 20; // Default: fetch latest 20 messages
  const offset = options?.offset ?? 0;

  // Get thread
  const { data: thread, error: threadError } = await supabase
    .from("email_threads")
    .select("*")
    .eq("id", threadId)
    .eq("user_id", userId)
    .single();

  if (threadError || !thread) {
    console.error("Error fetching thread:", threadError);
    return null;
  }

  const totalMessages = thread.message_count || 0;

  // Get messages with pagination - latest messages first for initial load
  // We'll reverse them in UI to show chronologically
  const { data: messages, error: messagesError } = await supabase
    .from("user_emails")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false }) // Latest first
    .range(offset, offset + limit - 1);

  if (messagesError) {
    console.error("Error fetching messages:", messagesError);
    throw messagesError;
  }

  // Reverse to show in chronological order (oldest to newest)
  const chronologicalMessages = (messages || []).reverse();

  return {
    thread: {
      id: thread.id,
      subject: thread.subject || "(No Subject)",
      snippet: thread.snippet || "",
      messageCount: thread.message_count || 1,
      unreadCount: thread.unread_count || 0,
      lastMessageAt: thread.last_message_at,
      participantEmails: thread.participant_emails || [],
      isStarred: thread.is_starred || false,
      isArchived: thread.is_archived || false,
      labels: [], // Labels removed - simplified folder system
    },
    messages: chronologicalMessages.map((m: Record<string, unknown>) => ({
      id: m.id as string,
      threadId: (m.thread_id as string) || threadId,
      fromAddress: (m.from_address as string) || "",
      toAddresses: (m.to_addresses as string[]) || [],
      ccAddresses: (m.cc_addresses as string[]) || [],
      bccAddresses: (m.bcc_addresses as string[]) || [],
      subject: (m.subject as string) || "(No Subject)",
      bodyHtml: (m.body_html as string) || "",
      bodyText:
        (m.body_text as string) ||
        (m.body_html as string)?.replace(/<[^>]*>/g, "") ||
        "",
      createdAt: m.created_at as string,
      isIncoming: (m.is_incoming as boolean) || false,
      isRead: (m.is_read as boolean) || false,
      hasAttachments: (m.has_attachments as boolean) || false,
      attachments:
        (m.attachments as { name: string; size: number; url?: string }[]) || [],
      source: m.source as string | undefined,
      openCount: (m.open_count as number) || 0,
      clickCount: (m.click_count as number) || 0,
    })),
    totalMessages,
    hasMore: offset + limit < totalMessages,
  };
}

// Fetch earlier messages for "Load more" functionality
export async function getEarlierMessages(
  threadId: string,
  offset: number,
  limit: number = 10,
): Promise<{ messages: Message[]; hasMore: boolean }> {
  // Get total count first
  const { count } = await supabase
    .from("user_emails")
    .select("*", { count: "exact", head: true })
    .eq("thread_id", threadId);

  const totalMessages = count || 0;

  // Fetch messages
  const { data: messages, error } = await supabase
    .from("user_emails")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching earlier messages:", error);
    throw error;
  }

  // Reverse to chronological order
  const chronologicalMessages = (messages || []).reverse();

  return {
    messages: chronologicalMessages.map((m: Record<string, unknown>) => ({
      id: m.id as string,
      threadId: (m.thread_id as string) || threadId,
      fromAddress: (m.from_address as string) || "",
      toAddresses: (m.to_addresses as string[]) || [],
      ccAddresses: (m.cc_addresses as string[]) || [],
      bccAddresses: (m.bcc_addresses as string[]) || [],
      subject: (m.subject as string) || "(No Subject)",
      bodyHtml: (m.body_html as string) || "",
      bodyText:
        (m.body_text as string) ||
        (m.body_html as string)?.replace(/<[^>]*>/g, "") ||
        "",
      createdAt: m.created_at as string,
      isIncoming: (m.is_incoming as boolean) || false,
      isRead: (m.is_read as boolean) || false,
      hasAttachments: (m.has_attachments as boolean) || false,
      attachments:
        (m.attachments as { name: string; size: number; url?: string }[]) || [],
      source: m.source as string | undefined,
      openCount: (m.open_count as number) || 0,
      clickCount: (m.click_count as number) || 0,
    })),
    hasMore: offset + limit < totalMessages,
  };
}

export async function markThreadAsRead(
  threadId: string,
  userId: string,
): Promise<void> {
  // Update all unread messages in thread
  const { error } = await supabase
    .from("user_emails")
    .update({ is_read: true })
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking thread as read:", error);
    throw error;
  }

  // Update thread unread count
  await supabase
    .from("email_threads")
    .update({ unread_count: 0 })
    .eq("id", threadId);
}

export async function toggleThreadStar(
  threadId: string,
  isStarred: boolean,
): Promise<void> {
  console.log(
    "[toggleThreadStar] Updating thread:",
    threadId,
    "isStarred:",
    isStarred,
  );

  const { data, error } = await supabase
    .from("email_threads")
    .update({ is_starred: isStarred })
    .eq("id", threadId)
    .select();

  if (error) {
    console.error("[toggleThreadStar] Error:", error);
    throw error;
  }

  console.log("[toggleThreadStar] Success, updated:", data);
}

export async function archiveThread(threadId: string): Promise<void> {
  const { error } = await supabase
    .from("email_threads")
    .update({ is_archived: true })
    .eq("id", threadId);

  if (error) {
    console.error("Error archiving thread:", error);
    throw error;
  }
}

export async function unarchiveThread(threadId: string): Promise<void> {
  const { error } = await supabase
    .from("email_threads")
    .update({ is_archived: false })
    .eq("id", threadId);

  if (error) {
    console.error("Error unarchiving thread:", error);
    throw error;
  }
}

export async function addLabelToThread(
  threadId: string,
  labelId: string,
  currentLabels: string[],
): Promise<void> {
  const newLabels = [...new Set([...currentLabels, labelId])];

  const { error } = await supabase
    .from("email_threads")
    .update({ labels: newLabels })
    .eq("id", threadId);

  if (error) {
    console.error("Error adding label:", error);
    throw error;
  }
}

export async function removeLabelFromThread(
  threadId: string,
  labelId: string,
  currentLabels: string[],
): Promise<void> {
  const newLabels = currentLabels.filter((l) => l !== labelId);

  const { error } = await supabase
    .from("email_threads")
    .update({ labels: newLabels })
    .eq("id", threadId);

  if (error) {
    console.error("Error removing label:", error);
    throw error;
  }
}

export async function deleteThread(
  threadId: string,
  userId: string,
): Promise<void> {
  // Delete all messages in thread
  const { error: messagesError } = await supabase
    .from("user_emails")
    .delete()
    .eq("thread_id", threadId)
    .eq("user_id", userId);

  if (messagesError) {
    console.error("Error deleting messages:", messagesError);
    throw messagesError;
  }

  // Delete thread
  const { error: threadError } = await supabase
    .from("email_threads")
    .delete()
    .eq("id", threadId)
    .eq("user_id", userId);

  if (threadError) {
    console.error("Error deleting thread:", threadError);
    throw threadError;
  }
}
