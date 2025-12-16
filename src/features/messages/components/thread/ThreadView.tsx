// src/features/messages/components/thread/ThreadView.tsx
// Display a full email thread conversation

import { useState } from "react";
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
  Tag,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Bot,
  Eye,
  MousePointer,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/features/email/services/sanitizationService";

interface ThreadViewProps {
  threadId: string;
  onClose: () => void;
}

export function ThreadView({ threadId, onClose }: ThreadViewProps) {
  const {
    thread,
    messages,
    isLoading,
    error,
    markAsRead: _markAsRead,
  } = useThread(threadId);
  const { toggleStar, archive, isStarring, isArchiving } = useThreads();
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(),
  );

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

  const handleArchive = () => {
    if (!thread) return;
    archive(thread.id);
    onClose(); // Close the view after archiving
  };

  // Mark as read on view
  // useEffect(() => {
  //   if (thread?.unreadCount > 0) {
  //     markAsRead();
  //   }
  // }, [thread?.id]);

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

  const toggleMessage = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  // By default, expand only the last message
  const latestMessageId = messages?.[messages.length - 1]?.id;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{thread.subject}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {thread.messageCount} message
                {thread.messageCount !== 1 ? "s" : ""}
              </span>
              {thread.labels?.map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  className="h-4 px-1 text-[9px]"
                  style={{ borderColor: label.color, color: label.color }}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleArchive}
              disabled={isArchiving}
              title="Archive"
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleToggleStar}
              disabled={isStarring}
              title={thread.isStarred ? "Unstar" : "Star"}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  thread.isStarred && "text-yellow-500 fill-yellow-500",
                )}
              />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Tag className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-[11px]" onClick={handleReply}>
                  <Reply className="h-3.5 w-3.5 mr-2" /> Reply
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[11px]"
                  onClick={handleForward}
                >
                  <Forward className="h-3.5 w-3.5 mr-2" /> Forward
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-[11px] text-destructive"
                  onClick={handleArchive}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {messages?.map((message, index) => {
            const isExpanded =
              expandedMessages.has(message.id) ||
              message.id === latestMessageId;
            const isLast = index === messages.length - 1;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isExpanded={isExpanded}
                isLast={isLast}
                onToggle={() => toggleMessage(message.id)}
              />
            );
          })}
        </div>
      </ScrollArea>

      {/* Quick Reply */}
      <div className="flex-shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1.5"
            onClick={handleReply}
          >
            <Reply className="h-3.5 w-3.5" />
            Reply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] gap-1.5"
            onClick={handleReply}
          >
            <ReplyAll className="h-3.5 w-3.5" />
            Reply All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] gap-1.5"
            onClick={handleForward}
          >
            <Forward className="h-3.5 w-3.5" />
            Forward
          </Button>
        </div>
      </div>

      {/* Compose Dialog for Reply/Forward */}
      <ComposeDialog
        open={composeState.open}
        onOpenChange={(open) => setComposeState({ ...composeState, open })}
        replyTo={composeState.replyTo}
        forward={composeState.forward}
      />
    </div>
  );
}

interface MessageBubbleProps {
  message: {
    id: string;
    fromAddress: string;
    toAddresses: string[];
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

function MessageBubble({
  message,
  isExpanded,
  isLast: _isLast,
  onToggle,
}: MessageBubbleProps) {
  const initials = getInitials(message.fromAddress);
  const isAutomated = message.source === "workflow";

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Header - always visible */}
      <button
        className="w-full text-left px-3 py-2 hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarFallback className="text-[9px] bg-muted">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium truncate">
                {formatEmailAddress(message.fromAddress)}
              </span>
              {isAutomated && (
                <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                  <Bot className="h-2.5 w-2.5 mr-0.5" />
                  Auto
                </Badge>
              )}
            </div>
            {!isExpanded && (
              <div className="text-[10px] text-muted-foreground truncate">
                {message.bodyText?.slice(0, 100)}...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Tracking stats */}
            {!message.isIncoming && (message.openCount || 0) > 0 && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Eye className="h-3 w-3" />
                {message.openCount}
              </span>
            )}
            {!message.isIncoming && (message.clickCount || 0) > 0 && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <MousePointer className="h-3 w-3" />
                {message.clickCount}
              </span>
            )}

            <span className="text-[10px] text-muted-foreground">
              {format(new Date(message.createdAt), "MMM d, h:mm a")}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Body - expanded only */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* To/CC info */}
          <div className="px-3 py-1.5 bg-muted/30 text-[10px] text-muted-foreground">
            <span>To: {message.toAddresses?.join(", ")}</span>
          </div>

          {/* Email body - sanitized to prevent XSS */}
          <div
            className="px-3 py-3 text-[11px] prose prose-sm max-w-none
              prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(message.bodyHtml || message.bodyText || ""),
            }}
          />

          {/* Attachments */}
          {message.hasAttachments && message.attachments && (
            <div className="px-3 py-2 border-t border-border bg-muted/30">
              <div className="text-[10px] text-muted-foreground mb-1.5">
                {message.attachments.length} attachment
                {message.attachments.length !== 1 ? "s" : ""}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {message.attachments.map((att, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                  >
                    <Paperclip className="h-3 w-3" />
                    {att.name}
                    <ExternalLink className="h-2.5 w-2.5" />
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
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-border">
        <Skeleton className="h-5 w-64 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border rounded-sm p-3">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24 ml-auto" />
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
