// src/features/messages/components/thread/ThreadView.tsx
// Display a full email thread conversation with pagination and professional styling

import { useState, useEffect } from "react";
import { useThread } from "../../hooks/useThread";
import { useThreads } from "../../hooks/useThreads";
import { ComposeDialog } from "../compose/ComposeDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  Star,
  Archive,
  Trash2,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Bot,
  Eye,
  MousePointer,
  Loader2,
  Send,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/features/email/services/sanitizationService";

interface ThreadViewProps {
  threadId: string;
  onClose: () => void;
}

// Number of latest messages to show expanded by default
const EXPANDED_MESSAGE_COUNT = 5;

export function ThreadView({ threadId, onClose }: ThreadViewProps) {
  const {
    thread,
    messages,
    totalMessages,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMoreMessages,
    markAsRead: _markAsRead,
  } = useThread(threadId);
  const {
    toggleStar,
    archive,
    unarchive,
    deleteThread,
    isStarring,
    isArchiving,
    isUnarchiving,
    isDeleting,
  } = useThreads();

  // Track which messages are manually expanded/collapsed
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set());
  const [manualCollapsed, setManualCollapsed] = useState<Set<string>>(
    new Set(),
  );

  // Reset expansion state when thread changes
  useEffect(() => {
    setManualExpanded(new Set());
    setManualCollapsed(new Set());
  }, [threadId]);

  // Reply/Forward state
  const [composeState, setComposeState] = useState<{
    open: boolean;
    replyTo?: {
      threadId: string;
      messageId: string;
      to: string;
      subject: string;
    };
    forward?: { subject: string; body: string };
  }>({ open: false });

  const handleReply = () => {
    if (!thread || !messages?.length) return;
    const lastMessage = messages[messages.length - 1];
    setComposeState({
      open: true,
      replyTo: {
        threadId: thread.id,
        messageId: lastMessage.id,
        to: lastMessage.fromAddress,
        subject: thread.subject,
      },
    });
  };

  const handleForward = () => {
    if (!thread || !messages?.length) return;
    const lastMessage = messages[messages.length - 1];
    setComposeState({
      open: true,
      forward: {
        subject: thread.subject,
        body: lastMessage.bodyText || "",
      },
    });
  };

  const handleToggleStar = () => {
    if (!thread) return;
    toggleStar(thread.id, !thread.isStarred);
  };

  const handleArchiveToggle = () => {
    if (!thread) return;
    if (thread.isArchived) {
      unarchive(thread.id);
    } else {
      archive(thread.id);
      onClose(); // Only close when archiving, not unarchiving
    }
  };

  const handleDelete = () => {
    if (!thread) return;
    deleteThread(thread.id);
    onClose();
  };

  if (isLoading) {
    return <ThreadViewSkeleton />;
  }

  if (error || !thread) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground">
        <p className="text-sm">Failed to load conversation</p>
        <p className="text-[10px] mt-1">
          {error?.message || "Thread not found"}
        </p>
      </div>
    );
  }

  const toggleMessage = (messageId: string, currentlyExpanded: boolean) => {
    if (currentlyExpanded) {
      // Collapse it
      setManualCollapsed((prev) => new Set(prev).add(messageId));
      setManualExpanded((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    } else {
      // Expand it
      setManualExpanded((prev) => new Set(prev).add(messageId));
      setManualCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  };

  // Determine which messages should be expanded
  // Default: latest 5 messages expanded, older ones collapsed
  const getIsExpanded = (messageId: string, index: number): boolean => {
    // Manual states take precedence
    if (manualExpanded.has(messageId)) return true;
    if (manualCollapsed.has(messageId)) return false;

    // Default: expand latest EXPANDED_MESSAGE_COUNT messages
    const messagesFromEnd = messages.length - 1 - index;
    return messagesFromEnd < EXPANDED_MESSAGE_COUNT;
  };

  // Count collapsed older messages
  const collapsedCount =
    messages.length > EXPANDED_MESSAGE_COUNT
      ? messages.length - EXPANDED_MESSAGE_COUNT
      : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold leading-tight">
              {thread.subject}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {totalMessages} message{totalMessages !== 1 ? "s" : ""}
              </span>
              {thread.isStarred && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              size="sm"
              className={cn(
                "h-7 w-7 p-0 border-0 shadow-none",
                thread.isArchived
                  ? "bg-primary/20 hover:bg-primary/30 text-primary"
                  : "bg-transparent hover:bg-primary/10 text-muted-foreground hover:text-primary",
              )}
              onClick={handleArchiveToggle}
              disabled={isArchiving || isUnarchiving}
              title={thread.isArchived ? "Unarchive" : "Archive"}
            >
              <Archive
                className={cn(
                  "h-3.5 w-3.5",
                  thread.isArchived && "fill-primary/20",
                )}
              />
            </Button>
            <Button
              size="sm"
              className={cn(
                "h-7 w-7 p-0 border-0 shadow-none",
                thread.isStarred
                  ? "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500"
                  : "bg-transparent hover:bg-primary/10 text-muted-foreground hover:text-primary",
              )}
              onClick={handleToggleStar}
              disabled={isStarring}
              title={thread.isStarred ? "Unstar" : "Star"}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  thread.isStarred && "fill-yellow-500",
                )}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-7 w-7 p-0 bg-transparent hover:bg-primary/10 text-muted-foreground hover:text-primary border-0 shadow-none"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-sm" onClick={handleReply}>
                  <Reply className="h-4 w-4 mr-2" /> Reply
                </DropdownMenuItem>
                <DropdownMenuItem className="text-sm" onClick={handleForward}>
                  <Forward className="h-4 w-4 mr-2" /> Forward
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-sm text-destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              className="h-7 w-7 p-0 bg-transparent hover:bg-destructive/10 text-muted-foreground hover:text-destructive border-0 shadow-none"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Load More Button (at top for older messages) */}
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                size="sm"
                className="h-8 text-sm gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-0 shadow-none"
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Load earlier messages
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Collapsed messages indicator */}
          {collapsedCount > 0 && !hasMore && (
            <div className="flex items-center justify-center py-2">
              <span className="text-sm text-muted-foreground">
                {collapsedCount} earlier message
                {collapsedCount !== 1 ? "s" : ""} collapsed
              </span>
            </div>
          )}

          {messages?.map((message, index) => {
            const isExpanded = getIsExpanded(message.id, index);
            const isLast = index === messages.length - 1;

            return (
              <MessageCard
                key={message.id}
                message={message}
                isExpanded={isExpanded}
                isLast={isLast}
                onToggle={() => toggleMessage(message.id, isExpanded)}
              />
            );
          })}
        </div>
      </ScrollArea>

      {/* Quick Reply Footer */}
      <div className="flex-shrink-0 border-t border-border/50 p-2 bg-card">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 text-sm gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-none"
            onClick={handleReply}
          >
            <Reply className="h-4 w-4" />
            Reply
          </Button>
          <Button
            size="sm"
            className="h-8 text-sm gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-0 shadow-none"
            onClick={handleReply}
          >
            <ReplyAll className="h-4 w-4" />
            Reply All
          </Button>
          <Button
            size="sm"
            className="h-8 text-sm gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-0 shadow-none"
            onClick={handleForward}
          >
            <Forward className="h-4 w-4" />
            Forward
          </Button>
        </div>
      </div>

      {/* Compose Dialog */}
      <ComposeDialog
        open={composeState.open}
        onOpenChange={(open) => setComposeState({ ...composeState, open })}
        replyTo={composeState.replyTo}
        forward={composeState.forward}
      />
    </div>
  );
}

interface MessageCardProps {
  message: {
    id: string;
    senderId?: string;
    senderName?: string;
    fromAddress: string;
    toAddresses: string[];
    ccAddresses?: string[];
    subject: string;
    bodyHtml: string;
    bodyText: string;
    createdAt: string;
    isIncoming: boolean;
    hasAttachments: boolean;
    attachments?: { name: string; size: number }[];
    source?: string;
    openCount?: number;
    clickCount?: number;
  };
  isExpanded: boolean;
  isLast: boolean;
  onToggle: () => void;
}

function MessageCard({
  message,
  isExpanded,
  isLast: _isLast,
  onToggle,
}: MessageCardProps) {
  const isAutomated = message.source === "workflow";
  const isSent = !message.isIncoming;

  // Use senderName for display, fallback to formatted email
  const displayName = isSent
    ? "Me"
    : message.senderName || formatEmailAddress(message.fromAddress);
  const initials = isSent
    ? "ME"
    : message.senderName
      ? message.senderName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : getInitials(message.fromAddress);

  return (
    <div
      className={cn(
        "rounded-md overflow-hidden transition-all",
        isExpanded ? "shadow-sm" : "",
        isSent
          ? "bg-primary/5 border border-primary/20"
          : "bg-card border border-border",
      )}
    >
      {/* Header - always visible */}
      <button
        className={cn(
          "w-full text-left px-3 py-2 transition-colors",
          isExpanded ? "border-b border-border/50" : "",
          "hover:bg-muted/30",
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Avatar
            className={cn(
              "h-8 w-8 flex-shrink-0",
              isSent ? "ring-2 ring-primary/30" : "",
            )}
          >
            <AvatarFallback
              className={cn(
                "text-xs font-medium",
                isSent
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">
                {displayName}
              </span>
              {isSent && (
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-xs border-primary/40 text-primary"
                >
                  <Send className="h-3 w-3 mr-0.5" />
                  Sent
                </Badge>
              )}
              {isAutomated && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  <Bot className="h-3 w-3 mr-0.5" />
                  Auto
                </Badge>
              )}
            </div>
            {!isExpanded && (
              <div className="text-sm text-muted-foreground truncate mt-0.5">
                {message.bodyText?.slice(0, 80)}...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Tracking stats for sent messages */}
            {isSent && (message.openCount || 0) > 0 && (
              <span
                className="text-xs text-muted-foreground flex items-center gap-0.5"
                title="Opens"
              >
                <Eye className="h-3.5 w-3.5" />
                {message.openCount}
              </span>
            )}
            {isSent && (message.clickCount || 0) > 0 && (
              <span
                className="text-xs text-muted-foreground flex items-center gap-0.5"
                title="Clicks"
              >
                <MousePointer className="h-3.5 w-3.5" />
                {message.clickCount}
              </span>
            )}

            <span className="text-sm text-muted-foreground">
              {formatMessageDate(message.createdAt)}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Body - expanded only */}
      {isExpanded && (
        <div>
          {/* Email metadata */}
          <div className="px-3 py-2 bg-muted/20 text-sm text-muted-foreground space-y-0.5">
            <div className="flex items-start gap-1">
              <span className="font-medium w-10">From:</span>
              <span className="truncate">{message.fromAddress}</span>
            </div>
            <div className="flex items-start gap-1">
              <span className="font-medium w-10">To:</span>
              <span className="truncate">
                {message.toAddresses?.join(", ")}
              </span>
            </div>
            {message.ccAddresses && message.ccAddresses.length > 0 && (
              <div className="flex items-start gap-1">
                <span className="font-medium w-10">CC:</span>
                <span className="truncate">
                  {message.ccAddresses.join(", ")}
                </span>
              </div>
            )}
            <div className="flex items-start gap-1">
              <span className="font-medium w-10">Date:</span>
              <span>{format(new Date(message.createdAt), "PPpp")}</span>
            </div>
          </div>

          {/* Email body */}
          <div
            className={cn(
              "px-4 py-3 text-sm leading-relaxed",
              // Prose styling for HTML content
              "prose prose-sm max-w-none",
              "prose-p:my-2 prose-p:leading-relaxed",
              "prose-headings:my-3 prose-headings:font-semibold",
              "prose-ul:my-2 prose-ol:my-2",
              "prose-li:my-0.5",
              "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
              "prose-blockquote:border-l-2 prose-blockquote:border-muted-foreground/30 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-muted-foreground",
              "prose-pre:bg-muted prose-pre:text-xs",
              "prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:rounded",
              // Dark mode support
              "dark:prose-invert",
            )}
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(
                message.bodyHtml || formatPlainText(message.bodyText) || "",
              ),
            }}
          />

          {/* Attachments */}
          {message.hasAttachments &&
            message.attachments &&
            message.attachments.length > 0 && (
              <div className="px-3 py-2 border-t border-border/50 bg-muted/20">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                  <Paperclip className="h-4 w-4" />
                  <span>
                    {message.attachments.length} attachment
                    {message.attachments.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {message.attachments.map((att, i) => (
                    <Button
                      key={i}
                      size="sm"
                      className="h-7 text-sm gap-1 bg-primary/10 hover:bg-primary/20 text-primary border-0 shadow-none"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="max-w-[120px] truncate">{att.name}</span>
                      <span className="text-primary/70">
                        ({formatFileSize(att.size)})
                      </span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function ThreadViewSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-4 border-b border-border bg-card">
        <Skeleton className="h-5 w-64 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="flex-1 p-3 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border rounded-md p-3 bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3 w-32 mb-1" />
                <Skeleton className="h-2 w-48" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions
function getInitials(email: string): string {
  const namePart = email.split("@")[0];
  const parts = namePart.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return namePart.slice(0, 2).toUpperCase();
}

function formatEmailAddress(email: string): string {
  const namePart = email.split("@")[0];
  const parts = namePart.split(/[._-]/);
  if (parts.length >= 2) {
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  if (isYesterday(date)) {
    return `Yesterday ${format(date, "h:mm a")}`;
  }
  return format(date, "MMM d");
}

function formatPlainText(text: string): string {
  if (!text) return "";
  // Convert plain text to HTML with line breaks
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
