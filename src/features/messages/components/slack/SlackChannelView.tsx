// src/features/messages/components/slack/SlackChannelView.tsx
// Displays Slack channel messages and message composer

import { useState, useEffect, useRef } from "react";
import {
  Hash,
  Lock,
  Loader2,
  Send,
  AlertCircle,
  UserPlus,
  SmilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { useCurrentUserProfile } from "@/hooks/admin/useUserApproval";
import { useJoinSlackChannel, useAddSlackReaction } from "@/hooks/slack";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import * as emoji from "node-emoji";
import type { SlackChannel } from "@/types/slack.types";

// Common emoji reactions for quick access
const QUICK_REACTIONS = [
  { name: "thumbsup", emoji: "👍" },
  { name: "heart", emoji: "❤️" },
  { name: "fire", emoji: "🔥" },
  { name: "tada", emoji: "🎉" },
  { name: "rocket", emoji: "🚀" },
  { name: "eyes", emoji: "👀" },
  { name: "clap", emoji: "👏" },
  { name: "muscle", emoji: "💪" },
];

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Add reaction mutation
  const addReaction = useAddSlackReaction();

  const handleAddReaction = async (messageTs: string, emojiName: string) => {
    try {
      const result = await addReaction.mutateAsync({
        channelId: channel.id,
        messageTs,
        emojiName,
      });
      if (result.ok || result.alreadyReacted) {
        // Refetch messages to show updated reactions
        queryClient.invalidateQueries({
          queryKey: ["slack-messages", channel.id],
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
              <MessageItem
                key={msg.id}
                message={msg}
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

  // Convert all Slack emoji codes using node-emoji library
  formatted = emoji.emojify(formatted);

  return formatted;
}

/**
 * Slack-to-standard emoji name mapping
 * Slack uses some different names than the standard emoji library
 */
const SLACK_EMOJI_MAP: Record<string, string> = {
  raised_hands: "🙌",
  raising_hand: "🙋",
  ok_hand: "👌",
  point_up: "☝️",
  point_down: "👇",
  point_left: "👈",
  point_right: "👉",
  thumbsup: "👍",
  thumbsdown: "👎",
  punch: "👊",
  fist: "✊",
  wave: "👋",
  clap: "👏",
  open_hands: "👐",
  pray: "🙏",
  handshake: "🤝",
  muscle: "💪",
  metal: "🤘",
  crossed_fingers: "🤞",
  v: "✌️",
  writing_hand: "✍️",
  selfie: "🤳",
  nail_care: "💅",
  ring: "💍",
  lipstick: "💄",
  kiss: "💋",
  lips: "👄",
  tongue: "👅",
  ear: "👂",
  nose: "👃",
  footprints: "👣",
  eye: "👁️",
  eyes: "👀",
  brain: "🧠",
  bone: "🦴",
  tooth: "🦷",
  speaking_head: "🗣️",
  bust_in_silhouette: "👤",
  busts_in_silhouette: "👥",
  baby: "👶",
  girl: "👧",
  boy: "👦",
  woman: "👩",
  man: "👨",
  // Common Slack emojis
  white_check_mark: "✅",
  heavy_check_mark: "✔️",
  x: "❌",
  negative_squared_cross_mark: "❎",
  exclamation: "❗",
  question: "❓",
  grey_exclamation: "❕",
  grey_question: "❔",
  heavy_plus_sign: "➕",
  heavy_minus_sign: "➖",
  heavy_division_sign: "➗",
  curly_loop: "➰",
  loop: "➿",
  arrow_heading_up: "⤴️",
  arrow_heading_down: "⤵️",
  star: "⭐",
  star2: "🌟",
  sparkles: "✨",
  dizzy: "💫",
  boom: "💥",
  fire: "🔥",
  droplet: "💧",
  sweat_drops: "💦",
  dash: "💨",
  poop: "💩",
  // First/second/third place
  first_place_medal: "🥇",
  second_place_medal: "🥈",
  third_place_medal: "🥉",
  trophy: "🏆",
  sports_medal: "🏅",
  medal: "🎖️",
  military_medal: "🎖️",
  // Other common ones
  heart: "❤️",
  heartpulse: "💗",
  heartbeat: "💓",
  sparkling_heart: "💖",
  two_hearts: "💕",
  revolving_hearts: "💞",
  cupid: "💘",
  gift_heart: "💝",
  broken_heart: "💔",
  heart_exclamation: "❣️",
  heavy_heart_exclamation: "❣️",
  tada: "🎉",
  confetti_ball: "🎊",
  party_popper: "🎉",
  rocket: "🚀",
  100: "💯",
  zzz: "💤",
  money_mouth_face: "🤑",
  thinking: "🤔",
  thinking_face: "🤔",
  face_with_monocle: "🧐",
  sunglasses: "😎",
  nerd_face: "🤓",
  cowboy_hat_face: "🤠",
  partying_face: "🥳",
  wink: "😉",
  smile: "😄",
  grin: "😁",
  grinning: "😀",
  smiley: "😃",
  laughing: "😆",
  joy: "😂",
  rofl: "🤣",
  rolling_on_the_floor_laughing: "🤣",
  slightly_smiling_face: "🙂",
  upside_down_face: "🙃",
  relieved: "😌",
  heart_eyes: "😍",
  smiling_face_with_three_hearts: "🥰",
  kissing_heart: "😘",
  yum: "😋",
  stuck_out_tongue: "😛",
  stuck_out_tongue_winking_eye: "😜",
  stuck_out_tongue_closed_eyes: "😝",
  zany_face: "🤪",
  face_with_raised_eyebrow: "🤨",
  neutral_face: "😐",
  expressionless: "😑",
  no_mouth: "😶",
  smirk: "😏",
  unamused: "😒",
  roll_eyes: "🙄",
  grimacing: "😬",
  lying_face: "🤥",
  shushing_face: "🤫",
  zipper_mouth_face: "🤐",
  face_with_symbols_on_mouth: "🤬",
  exploding_head: "🤯",
  flushed: "😳",
  disappointed: "😞",
  worried: "😟",
  angry: "😠",
  rage: "😡",
  pensive: "😔",
  confused: "😕",
  slightly_frowning_face: "🙁",
  frowning_face: "☹️",
  persevere: "😣",
  confounded: "😖",
  tired_face: "😫",
  weary: "😩",
  pleading_face: "🥺",
  cry: "😢",
  sob: "😭",
  triumph: "😤",
  face_with_steam_from_nose: "😤",
  angry_face_with_horns: "👿",
  skull: "💀",
  skull_and_crossbones: "☠️",
  ghost: "👻",
  alien: "👽",
  robot: "🤖",
  pumpkin: "🎃",
  smiling_imp: "😈",
  imp: "👿",
  japanese_ogre: "👹",
  japanese_goblin: "👺",
  clown_face: "🤡",
  see_no_evil: "🙈",
  hear_no_evil: "🙉",
  speak_no_evil: "🙊",
  cat: "🐱",
  dog: "🐶",
  unicorn: "🦄",
  rainbow: "🌈",
  sun_with_face: "🌞",
  full_moon_with_face: "🌝",
  new_moon_with_face: "🌚",
  sunny: "☀️",
  cloud: "☁️",
  umbrella: "☂️",
  snowflake: "❄️",
  zap: "⚡",
  hourglass: "⌛",
  watch: "⌚",
  alarm_clock: "⏰",
  stopwatch: "⏱️",
  timer_clock: "⏲️",
  clock: "🕐",
  bell: "🔔",
  no_bell: "🔕",
  mega: "📣",
  loudspeaker: "📢",
  mute: "🔇",
  sound: "🔉",
  loud_sound: "🔊",
  phone: "📱",
  telephone_receiver: "📞",
  email: "📧",
  envelope: "✉️",
  incoming_envelope: "📨",
  e_mail: "📧",
  mailbox: "📫",
  mailbox_closed: "📪",
  mailbox_with_mail: "📬",
  mailbox_with_no_mail: "📭",
  postbox: "📮",
  memo: "📝",
  pencil: "✏️",
  pencil2: "✏️",
  black_nib: "✒️",
  pen: "🖊️",
  lower_left_fountain_pen: "🖋️",
  lower_left_ballpoint_pen: "🖊️",
  lower_left_paintbrush: "🖌️",
  lower_left_crayon: "🖍️",
  book: "📖",
  books: "📚",
  notebook: "📓",
  ledger: "📒",
  page_facing_up: "📄",
  page_with_curl: "📃",
  bookmark_tabs: "📑",
  bookmark: "🔖",
  label: "🏷️",
  money_with_wings: "💸",
  moneybag: "💰",
  dollar: "💵",
  yen: "💴",
  euro: "💶",
  pound: "💷",
  credit_card: "💳",
  chart: "💹",
  chart_with_upwards_trend: "📈",
  chart_with_downwards_trend: "📉",
  bar_chart: "📊",
  calendar: "📅",
  date: "📅",
  spiral_calendar: "🗓️",
  card_index: "📇",
  card_file_box: "🗃️",
  ballot_box: "🗳️",
  file_cabinet: "🗄️",
  clipboard: "📋",
  file_folder: "📁",
  open_file_folder: "📂",
  dividers: "🗂️",
  newspaper: "📰",
  rolled_up_newspaper: "🗞️",
  spiral_notepad: "🗒️",
  closed_book: "📕",
  green_book: "📗",
  blue_book: "📘",
  orange_book: "📙",
  notebook_with_decorative_cover: "📔",
  // Arrows
  arrow_up: "⬆️",
  arrow_down: "⬇️",
  arrow_left: "⬅️",
  arrow_right: "➡️",
  arrow_upper_right: "↗️",
  arrow_lower_right: "↘️",
  arrow_lower_left: "↙️",
  arrow_upper_left: "↖️",
  arrow_up_down: "↕️",
  left_right_arrow: "↔️",
  arrows_counterclockwise: "🔄",
  arrow_backward: "◀️",
  arrow_forward: "▶️",
  arrow_up_small: "🔼",
  arrow_down_small: "🔽",
  leftwards_arrow_with_hook: "↩️",
  arrow_right_hook: "↪️",
};

/**
 * Convert a single emoji name to its unicode character
 * Falls back to the :name: format if not found
 */
function getEmojiFromName(name: string): string {
  // Check Slack-specific mapping first
  if (SLACK_EMOJI_MAP[name]) {
    return SLACK_EMOJI_MAP[name];
  }

  // Try node-emoji with colons
  const result = emoji.get(`:${name}:`);
  // emoji.get returns the input if not found
  if (result && result !== `:${name}:`) {
    return result;
  }

  // Return the colon format as fallback
  return `:${name}:`;
}

function MessageItem({
  message,
  onReactionAdd,
}: {
  message: SlackMessage;
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

  const formattedText = formatSlackText(message.text);

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
              className="w-auto p-2"
              side="top"
              align="start"
              sideOffset={4}
            >
              <div className="flex gap-1">
                {QUICK_REACTIONS.map((reaction) => (
                  <button
                    key={reaction.name}
                    onClick={() => handleReaction(reaction.name)}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors text-lg"
                    title={`:${reaction.name}:`}
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </div>
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
