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
  labelId?: string;
  search?: string;
  filter?: "inbox" | "sent" | "drafts" | "scheduled" | "archived";
  userId: string;
}

export async function getThreads(filters: ThreadFilters): Promise<Thread[]> {
  const { userId, labelId, search, filter = "inbox" } = filters;

  // Build query for threads
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

  // Apply filter
  switch (filter) {
    case "inbox":
      query = query.eq("is_archived", false);
      break;
    case "archived":
      query = query.eq("is_archived", true);
      break;
    case "sent":
      // For sent, we'll filter messages that are outgoing
      break;
  }

  // Apply label filter
  if (labelId) {
    query = query.contains("labels", [labelId]);
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

  if (!threads) return [];

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

export async function getThread(
  threadId: string,
  userId: string,
): Promise<{
  thread: Thread;
  messages: Message[];
} | null> {
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

  // Get messages in thread
  const { data: messages, error: messagesError } = await supabase
    .from("user_emails")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("Error fetching messages:", messagesError);
    throw messagesError;
  }

  // Get labels
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
      labels: (thread.labels || [])
        .map((labelId: string) => labelMap.get(labelId))
        .filter(Boolean) as ThreadLabel[],
    },
    messages: (messages || []).map((m: Record<string, unknown>) => ({
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
  const { error } = await supabase
    .from("email_threads")
    .update({ is_starred: isStarred })
    .eq("id", threadId);

  if (error) {
    console.error("Error toggling star:", error);
    throw error;
  }
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
