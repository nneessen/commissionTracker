// src/features/messages/components/slack/SlackChannelView.tsx
// Displays Slack channel messages and message composer

import { useState, useEffect, useRef } from "react";
import { Hash, Lock, Loader2, Send, AlertCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { useCurrentUserProfile } from "@/hooks/admin/useUserApproval";
import { useJoinSlackChannel } from "@/hooks/slack";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { SlackChannel } from "@/types/slack.types";

interface SlackMessage {
  id: string;
  text: string;
  timestamp: string;
  threadTs?: string;
  replyCount?: number;
  user: {
    id: string;
    name: string;
    real_name?: string;
    profile?: {
      image_48?: string;
      display_name?: string;
    };
  } | null;
  reactions?: Array<{ name: string; count: number }>;
}

interface SlackChannelViewProps {
  channel: SlackChannel;
}

export function SlackChannelView({ channel }: SlackChannelViewProps) {
  const { data: profile } = useCurrentUserProfile();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [needsJoin, setNeedsJoin] = useState(false);
  const joinChannel = useJoinSlackChannel();

  // Auto-join channel if bot is not a member
  useEffect(() => {
    if (!channel.is_member && !isJoining) {
      handleAutoJoin();
    } else {
      setNeedsJoin(false);
    }
  }, [channel.id, channel.is_member]);

  const handleAutoJoin = async () => {
    if (!profile?.imo_id || channel.is_private) {
      // Can't auto-join private channels
      if (channel.is_private) {
        setNeedsJoin(true);
      }
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinChannel.mutateAsync(channel.id);
      if (result.ok) {
        // Successfully joined, refetch messages
        queryClient.invalidateQueries({ queryKey: ["slack-channels"] });
        setNeedsJoin(false);
      } else {
        console.error("Failed to join channel:", result.error);
        setNeedsJoin(true);
      }
    } catch (err) {
      console.error("Error joining channel:", err);
      setNeedsJoin(true);
    } finally {
      setIsJoining(false);
    }
  };

  // Fetch messages
  const {
    data: messagesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["slack-messages", channel.id],
    queryFn: async () => {
      if (!profile?.imo_id) return { messages: [], hasMore: false };

      const { data, error } = await supabase.functions.invoke(
        "slack-get-messages",
        {
          body: { imoId: profile.imo_id, channelId: channel.id, limit: 50 },
        },
      );

      if (error) throw error;

      // Check if we got a Slack API error
      if (!data?.ok) {
        // If not in channel, mark that we need to join
        if (data?.slackError === "not_in_channel") {
          setNeedsJoin(true);
        }
        throw new Error(data?.error || "Failed to fetch messages");
      }

      setNeedsJoin(false);
      return data as {
        messages: SlackMessage[];
        hasMore: boolean;
        nextCursor?: string;
      };
    },
    enabled: !!profile?.imo_id && !!channel.id && !isJoining,
    refetchInterval: needsJoin ? false : 30000, // Don't poll if we need to join
    retry: false, // Don't retry on failure
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      if (!profile?.imo_id) throw new Error("No IMO");

      const { data, error } = await supabase.functions.invoke(
        "slack-send-message",
        {
          body: {
            imoId: profile.imo_id,
            channelId: channel.id,
            text,
          },
        },
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to send message");

      return data;
    },
    onSuccess: () => {
      setMessageText("");
      // Refetch messages after sending
      queryClient.invalidateQueries({
        queryKey: ["slack-messages", channel.id],
      });
    },
    onError: (err) => {
      toast.error(
        `Failed to send: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    },
  });

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.messages]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessage.mutate(messageText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Messages are returned newest first, reverse for display
  const messages = [...(messagesData?.messages || [])].reverse();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Channel header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        {channel.is_private ? (
          <Lock className="h-4 w-4 text-zinc-500" />
        ) : (
          <Hash className="h-4 w-4 text-zinc-500" />
        )}
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {channel.name}
        </span>
        {channel.purpose?.value && (
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate ml-2">
            {channel.purpose.value}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 text-[10px]"
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {isJoining ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400 mb-2" />
            <p className="text-[11px] text-zinc-500">Joining channel...</p>
          </div>
        ) : needsJoin && channel.is_private ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Lock className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium mb-1">
              Private Channel
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-500 max-w-xs">
              The bot needs to be invited to this private channel by a Slack
              admin. Ask someone in Slack to invite the app to #{channel.name}.
            </p>
          </div>
        ) : needsJoin ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <UserPlus className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium mb-1">
              Unable to join channel
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-500 max-w-xs mb-3">
              The bot couldn't automatically join this channel.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={handleAutoJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <UserPlus className="h-3 w-3 mr-1" />
              )}
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
            <p className="text-[11px] text-red-500">
              {error instanceof Error
                ? error.message
                : "Failed to load messages"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-6 text-[10px]"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Hash className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-[11px] text-zinc-500">No messages yet</p>
            <p className="text-[10px] text-zinc-400 mt-1">
              Be the first to send a message!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message composer */}
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-end gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channel.name}`}
            className="min-h-[36px] max-h-24 text-[11px] resize-none"
            rows={1}
          />
          <Button
            size="sm"
            className="h-9 px-3"
            onClick={handleSend}
            disabled={!messageText.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Parse Slack message text and convert special formatting to readable text
 * Handles: user mentions, channel mentions, links, and special messages
 */
function formatSlackText(text: string): string {
  if (!text) return "";

  let formatted = text;

  // Convert user mentions <@U123ABC> to @user (just show as mention)
  formatted = formatted.replace(/<@([A-Z0-9]+)>/g, "@user");

  // Convert channel mentions <#C123ABC|channel-name> to #channel-name
  formatted = formatted.replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1");
  // Handle channel mentions without name <#C123ABC>
  formatted = formatted.replace(/<#([A-Z0-9]+)>/g, "#channel");

  // Convert links <https://url|text> to just text, or <https://url> to url
  formatted = formatted.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2");
  formatted = formatted.replace(/<(https?:\/\/[^>]+)>/g, "$1");

  // Handle special Slack messages
  if (formatted.includes("has joined the channel")) {
    formatted = formatted.replace(/@user/g, "Someone");
  }

  // Convert common Slack emoji codes
  formatted = formatted.replace(/:slightly_smiling_face:/g, "🙂");
  formatted = formatted.replace(/:thumbsup:/g, "👍");
  formatted = formatted.replace(/:wave:/g, "👋");
  formatted = formatted.replace(/:rocket:/g, "🚀");
  formatted = formatted.replace(/:tada:/g, "🎉");
  formatted = formatted.replace(/:fire:/g, "🔥");
  formatted = formatted.replace(/:heart:/g, "❤️");
  formatted = formatted.replace(/:+1:/g, "👍");
  formatted = formatted.replace(/:white_check_mark:/g, "✅");
  formatted = formatted.replace(/:x:/g, "❌");

  return formatted;
}

function MessageItem({ message }: { message: SlackMessage }) {
  const userName =
    message.user?.profile?.display_name ||
    message.user?.real_name ||
    message.user?.name ||
    "Unknown";

  const timestamp = message.timestamp
    ? new Date(parseFloat(message.timestamp) * 1000)
    : null;

  const formattedText = formatSlackText(message.text);

  // Check if this is a system/bot message (like "has joined the channel")
  const isSystemMessage =
    formattedText.includes("has joined the channel") ||
    formattedText.includes("has left the channel") ||
    formattedText.includes("set the channel") ||
    formattedText.includes("was added to");

  if (isSystemMessage) {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
          {formattedText}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-2 px-2 py-1 rounded">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.user?.profile?.image_48} />
        <AvatarFallback className="text-[10px] bg-zinc-200 dark:bg-zinc-700">
          {userName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
            {userName}
          </span>
          {timestamp && (
            <span className="text-[9px] text-zinc-400">
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
          {formattedText}
        </p>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((r) => (
              <span
                key={r.name}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[9px]"
              >
                :{r.name}: {r.count}
              </span>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {message.replyCount && message.replyCount > 0 && (
          <button className="mt-1 text-[10px] text-blue-500 hover:underline">
            {message.replyCount}{" "}
            {message.replyCount === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>
    </div>
  );
}
