// src/features/messages/components/slack/SlackChannelView.tsx
// Displays Slack channel messages and message composer

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Hash,
  Lock,
  Loader2,
  Send,
  AlertCircle,
  UserPlus,
  SmilePlus,
} from "lucide-react";
import EmojiPicker, {
  EmojiClickData,
  Theme,
  EmojiStyle,
  Categories,
} from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// eslint-disable-next-line no-restricted-imports
import { supabase } from "@/services/base/supabase";
import { useJoinSlackChannelById, useAddSlackReaction } from "@/hooks/slack";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { SlackChannel, SlackUser } from "@/types/slack.types";
import { getEmoji, processEmojiShortcodes } from "@/lib/emoji";
import { MentionTextarea } from "./MentionTextarea";
import { useSlackChannelMembers } from "@/hooks";

// Emoji-to-Slack-name mapping for common emojis
// This maps unicode emoji to Slack's emoji names
const EMOJI_TO_SLACK_NAME: Record<string, string> = {
  "👍": "thumbsup",
  "👎": "thumbsdown",
  "❤️": "heart",
  "🔥": "fire",
  "🎉": "tada",
  "🚀": "rocket",
  "👀": "eyes",
  "👏": "clap",
  "💪": "muscle",
  "😂": "joy",
  "😊": "blush",
  "😍": "heart_eyes",
  "🤔": "thinking_face",
  "👌": "ok_hand",
  "🙏": "pray",
  "✅": "white_check_mark",
  "❌": "x",
  "⭐": "star",
  "💯": "100",
  "🎯": "dart",
  "💡": "bulb",
  "⚡": "zap",
  "🔴": "red_circle",
  "🟢": "large_green_circle",
  "🟡": "large_yellow_circle",
  "🔵": "large_blue_circle",
  "😄": "smile",
  "😃": "smiley",
  "😁": "grin",
  "😆": "laughing",
  "🤣": "rofl",
  "😉": "wink",
  "😌": "relieved",
  "😘": "kissing_heart",
  "😋": "yum",
  "😛": "stuck_out_tongue",
  "😜": "stuck_out_tongue_winking_eye",
  "🤪": "zany_face",
  "😐": "neutral_face",
  "😑": "expressionless",
  "😏": "smirk",
  "😒": "unamused",
  "🙄": "roll_eyes",
  "😬": "grimacing",
  "😳": "flushed",
  "😞": "disappointed",
  "😟": "worried",
  "😠": "angry",
  "😡": "rage",
  "😔": "pensive",
  "😕": "confused",
  "😣": "persevere",
  "😖": "confounded",
  "😫": "tired_face",
  "😩": "weary",
  "😢": "cry",
  "😭": "sob",
  "😤": "triumph",
  "💀": "skull",
  "👻": "ghost",
  "👽": "alien",
  "🤖": "robot",
  "🎃": "jack_o_lantern",
  "🐱": "cat",
  "🐶": "dog",
  "🦄": "unicorn",
  "🌈": "rainbow",
  "☀️": "sunny",
  "☁️": "cloud",
  "❄️": "snowflake",
  "⚠️": "warning",
  "🚫": "no_entry_sign",
};

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
  integrationId: string;
}

export function SlackChannelView({
  channel,
  integrationId,
}: SlackChannelViewProps) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [needsJoin, setNeedsJoin] = useState(false);
  const joinChannel = useJoinSlackChannelById();

  // Auto-join channel if bot is not a member
  useEffect(() => {
    if (!channel.is_member && !isJoining) {
      handleAutoJoin();
    } else {
      setNeedsJoin(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, channel.is_member]);

  const handleAutoJoin = async () => {
    if (!integrationId || channel.is_private) {
      // Can't auto-join private channels
      if (channel.is_private) {
        setNeedsJoin(true);
      }
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinChannel.mutateAsync({
        integrationId,
        channelId: channel.id,
      });
      if (result.ok) {
        // Successfully joined, refetch messages
        queryClient.invalidateQueries({
          queryKey: ["slack", "channels", integrationId],
        });
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
    queryKey: ["slack-messages", integrationId, channel.id],
    queryFn: async () => {
      if (!integrationId) return { messages: [], hasMore: false };

      const { data, error } = await supabase.functions.invoke(
        "slack-get-messages",
        {
          body: { integrationId, channelId: channel.id, limit: 50 },
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
    enabled: !!integrationId && !!channel.id && !isJoining,
    refetchInterval: needsJoin ? false : 30000, // Don't poll if we need to join
    retry: false, // Don't retry on failure
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      if (!integrationId) throw new Error("No integration selected");

      const { data, error } = await supabase.functions.invoke(
        "slack-send-message",
        {
          body: {
            integrationId,
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
        queryKey: ["slack-messages", integrationId, channel.id],
      });
    },
    onError: (err) => {
      toast.error(
        `Failed to send: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    },
  });

  // Add reaction mutation
  const addReaction = useAddSlackReaction();

  const handleAddReaction = async (messageTs: string, emojiName: string) => {
    try {
      const result = await addReaction.mutateAsync({
        integrationId,
        channelId: channel.id,
        messageTs,
        emojiName,
      });
      if (result.ok || result.alreadyReacted) {
        // Refetch messages to show updated reactions
        queryClient.invalidateQueries({
          queryKey: ["slack-messages", integrationId, channel.id],
        });
      } else if (result.error) {
        toast.error(`Failed to add reaction: ${result.error}`);
      }
    } catch (err) {
      toast.error(
        `Failed to add reaction: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.messages]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessage.mutate(messageText.trim());
  };

  // Messages are returned newest first, reverse for display
  const messages = [...(messagesData?.messages || [])].reverse();

  // Fetch channel members for mention resolution
  const { data: channelMembers = [] } = useSlackChannelMembers(
    integrationId,
    channel.id,
  );

  // Create a map of user IDs to user objects for mention resolution
  // Include both users from messages AND all channel members
  const userMap = useMemo(() => {
    const map = new Map<string, SlackUser>();

    // First, add all channel members
    channelMembers.forEach((member) => {
      map.set(member.id, member);
    });

    // Then, overlay with users from messages (in case of newer data)
    messages.forEach((msg) => {
      if (msg.user) {
        map.set(msg.user.id, {
          id: msg.user.id,
          name: msg.user.name,
          real_name: msg.user.real_name,
          profile: msg.user.profile,
        });
      }
    });

    return map;
  }, [messages, channelMembers]);

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
              <MessageItem
                key={msg.id}
                message={msg}
                userMap={userMap}
                channelId={channel.id}
                onReactionAdd={handleAddReaction}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message composer */}
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-end gap-2">
          <MentionTextarea
            value={messageText}
            onChange={setMessageText}
            onSubmit={handleSend}
            integrationId={integrationId}
            channelId={channel.id}
            placeholder={`Message #${channel.name}`}
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
 * Handles: user mentions, channel mentions, links, emojis, and special messages
 */
function formatSlackText(
  text: string,
  userMap?: Map<string, SlackUser>,
): string {
  if (!text) return "";

  let formatted = text;

  // Step 1: Convert emoji shortcodes (:emoji:) to Unicode using shared utility
  formatted = processEmojiShortcodes(formatted);

  // Step 2: Convert user mentions with actual usernames if available
  if (userMap) {
    formatted = formatted.replace(/<@([A-Z0-9]+)>/g, (_match, userId) => {
      const user = userMap.get(userId);
      if (user) {
        const displayName =
          user.profile?.display_name || user.real_name || user.name;
        return `@${displayName}`;
      }
      return "@user"; // Fallback if user not found
    });
  } else {
    // No userMap provided - just show generic @user
    formatted = formatted.replace(/<@([A-Z0-9]+)>/g, "@user");
  }

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

  return formatted;
}

// Note: Emoji map moved to shared utility at src/lib/emoji.ts

/**
 * Convert a single emoji name to its unicode character
 * Uses shared emoji utility, falls back to :name: format if not found
 */
function getEmojiFromName(name: string): string {
  return getEmoji(name) || `:${name}:`;
}

function MessageItem({
  message,
  userMap,
  onReactionAdd,
}: {
  message: SlackMessage;
  userMap?: Map<string, SlackUser>;
  channelId?: string;
  onReactionAdd?: (messageTs: string, emojiName: string) => void;
}) {
  const [isReactionPopoverOpen, setIsReactionPopoverOpen] = useState(false);

  const userName =
    message.user?.profile?.display_name ||
    message.user?.real_name ||
    message.user?.name ||
    "Unknown";

  const timestamp = message.timestamp
    ? new Date(parseFloat(message.timestamp) * 1000)
    : null;

  const formattedText = formatSlackText(message.text, userMap);

  // Check if this is a system/bot message (like "has joined the channel")
  const isSystemMessage =
    formattedText.includes("has joined the channel") ||
    formattedText.includes("has left the channel") ||
    formattedText.includes("set the channel") ||
    formattedText.includes("was added to");

  const handleReaction = (emojiName: string) => {
    if (onReactionAdd && message.timestamp) {
      onReactionAdd(message.timestamp, emojiName);
      setIsReactionPopoverOpen(false);
    }
  };

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
    <div className="flex gap-2 group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-2 px-2 py-1 rounded relative">
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
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {message.reactions &&
            message.reactions.length > 0 &&
            message.reactions.map((r) => (
              <button
                key={r.name}
                onClick={() => handleReaction(r.name)}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-[9px] transition-colors cursor-pointer"
                title={`React with :${r.name}:`}
              >
                {getEmojiFromName(r.name)} {r.count}
              </button>
            ))}

          {/* Add reaction button */}
          <Popover
            open={isReactionPopoverOpen}
            onOpenChange={setIsReactionPopoverOpen}
          >
            <PopoverTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center h-5 w-5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                title="Add reaction"
              >
                <SmilePlus className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 border-0"
              side="top"
              align="start"
              sideOffset={4}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <EmojiPicker
                onEmojiClick={(emojiData: EmojiClickData) => {
                  // Convert emoji to Slack name or use the unified code
                  const slackName =
                    EMOJI_TO_SLACK_NAME[emojiData.emoji] ||
                    emojiData.names?.[0] ||
                    emojiData.unified.toLowerCase();
                  handleReaction(slackName);
                }}
                theme={Theme.AUTO}
                emojiStyle={EmojiStyle.NATIVE}
                width={350}
                height={400}
                previewConfig={{ showPreview: false }}
                searchPlaceHolder="Search emojis..."
                categories={[
                  {
                    category: Categories.SUGGESTED,
                    name: "Recently Used",
                  },
                  {
                    category: Categories.SMILEYS_PEOPLE,
                    name: "Smileys & People",
                  },
                  {
                    category: Categories.ANIMALS_NATURE,
                    name: "Animals & Nature",
                  },
                  {
                    category: Categories.FOOD_DRINK,
                    name: "Food & Drink",
                  },
                  {
                    category: Categories.TRAVEL_PLACES,
                    name: "Travel & Places",
                  },
                  {
                    category: Categories.ACTIVITIES,
                    name: "Activities",
                  },
                  {
                    category: Categories.OBJECTS,
                    name: "Objects",
                  },
                  {
                    category: Categories.SYMBOLS,
                    name: "Symbols",
                  },
                  {
                    category: Categories.FLAGS,
                    name: "Flags",
                  },
                ]}
              />
            </PopoverContent>
          </Popover>
        </div>

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
