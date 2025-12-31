// src/lib/emoji.ts
// Shared emoji utilities for template processing and Slack message rendering

import * as emoji from "node-emoji";

/**
 * Comprehensive emoji map for Slack-style shortcodes
 * Maps :emoji_name: syntax to actual Unicode emojis
 */
export const EMOJI_MAP: Record<string, string> = {
  // Hands & Gestures
  raised_hands: "🙌",
  raising_hand: "🙋",
  ok_hand: "👌",
  point_up: "☝️",
  point_down: "👇",
  point_left: "👈",
  point_right: "👉",
  thumbsup: "👍",
  "+1": "👍",
  thumbsdown: "👎",
  "-1": "👎",
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

  // Common Status Indicators
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

  // Celebrations & Success
  tada: "🎉",
  party_popper: "🎉",
  confetti_ball: "🎊",
  sparkles: "✨",
  star: "⭐",
  star2: "🌟",
  dizzy: "💫",
  boom: "💥",
  fire: "🔥",
  rocket: "🚀",
  trophy: "🏆",
  first_place_medal: "🥇",
  second_place_medal: "🥈",
  third_place_medal: "🥉",
  sports_medal: "🏅",
  medal: "🎖️",
  military_medal: "🎖️",
  100: "💯",

  // Hearts
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

  // Faces - Positive
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
  wink: "😉",
  relieved: "😌",
  heart_eyes: "😍",
  smiling_face_with_three_hearts: "🥰",
  kissing_heart: "😘",
  yum: "😋",
  sunglasses: "😎",
  nerd_face: "🤓",
  cowboy_hat_face: "🤠",
  partying_face: "🥳",

  // Faces - Thinking/Neutral
  thinking: "🤔",
  thinking_face: "🤔",
  face_with_monocle: "🧐",
  neutral_face: "😐",
  expressionless: "😑",
  no_mouth: "😶",
  smirk: "😏",
  unamused: "😒",
  roll_eyes: "🙄",
  grimacing: "😬",
  face_with_raised_eyebrow: "🤨",

  // Faces - Negative
  disappointed: "😞",
  worried: "😟",
  angry: "😠",
  rage: "😡",
  pensive: "😔",
  confused: "😕",
  slightly_frowning_face: "🙁",
  frowning_face: "☹️",
  cry: "😢",
  sob: "😭",
  triumph: "😤",
  pleading_face: "🥺",
  exploding_head: "🤯",
  flushed: "😳",

  // Fun/Special
  money_mouth_face: "🤑",
  zany_face: "🤪",
  stuck_out_tongue: "😛",
  stuck_out_tongue_winking_eye: "😜",
  stuck_out_tongue_closed_eyes: "😝",
  shushing_face: "🤫",
  zipper_mouth_face: "🤐",
  lying_face: "🤥",

  // Animals
  cat: "🐱",
  dog: "🐶",
  unicorn: "🦄",
  see_no_evil: "🙈",
  hear_no_evil: "🙉",
  speak_no_evil: "🙊",

  // Nature/Weather
  rainbow: "🌈",
  sun_with_face: "🌞",
  sunny: "☀️",
  cloud: "☁️",
  umbrella: "☂️",
  snowflake: "❄️",
  zap: "⚡",
  droplet: "💧",
  sweat_drops: "💦",
  dash: "💨",

  // Objects - Communication
  phone: "📱",
  telephone_receiver: "📞",
  email: "📧",
  envelope: "✉️",
  incoming_envelope: "📨",
  e_mail: "📧",
  mailbox: "📫",
  mailbox_with_mail: "📬",
  memo: "📝",
  pencil: "✏️",
  pen: "🖊️",

  // Objects - Time
  hourglass: "⌛",
  watch: "⌚",
  alarm_clock: "⏰",
  stopwatch: "⏱️",
  timer_clock: "⏲️",
  clock: "🕐",
  calendar: "📅",
  date: "📅",

  // Objects - Alerts
  bell: "🔔",
  no_bell: "🔕",
  mega: "📣",
  loudspeaker: "📢",
  rotating_light: "🚨",
  warning: "⚠️",

  // Money & Business
  moneybag: "💰",
  money_with_wings: "💸",
  dollar: "💵",
  credit_card: "💳",
  chart: "📊",
  chart_with_upwards_trend: "📈",
  chart_with_downwards_trend: "📉",
  briefcase: "💼",
  handshake_tone1: "🤝",

  // Arrows
  arrow_right: "➡️",
  arrow_left: "⬅️",
  arrow_up: "⬆️",
  arrow_down: "⬇️",
  arrow_heading_up: "⤴️",
  arrow_heading_down: "⤵️",
  arrows_counterclockwise: "🔄",
  back: "🔙",
  soon: "🔜",
  top: "🔝",

  // Misc
  link: "🔗",
  pushpin: "📌",
  round_pushpin: "📍",
  paperclip: "📎",
  lock: "🔒",
  unlock: "🔓",
  key: "🔑",
  bulb: "💡",
  gear: "⚙️",
  wrench: "🔧",
  hammer: "🔨",
  shield: "🛡️",
  flag: "🚩",
  checkered_flag: "🏁",
  crossed_flags: "🎌",

  // Numbers
  one: "1️⃣",
  two: "2️⃣",
  three: "3️⃣",
  four: "4️⃣",
  five: "5️⃣",
  six: "6️⃣",
  seven: "7️⃣",
  eight: "8️⃣",
  nine: "9️⃣",
  keycap_ten: "🔟",
  zero: "0️⃣",

  // Letters/Words
  new: "🆕",
  free: "🆓",
  up: "🆙",
  cool: "🆒",
  ok: "🆗",
  sos: "🆘",
  atm: "🏧",
  abc: "🔤",
  abcd: "🔡",
  capital_abcd: "🔠",
};

/**
 * Process emoji shortcodes in text, converting :emoji: to Unicode
 * Uses our custom map first, then falls back to node-emoji
 *
 * @param text - Text containing :emoji: shortcodes
 * @returns Text with emojis converted to Unicode
 *
 * @example
 * processEmojiShortcodes("Hello :wave: Welcome :tada:")
 * // Returns: "Hello 👋 Welcome 🎉"
 */
export function processEmojiShortcodes(text: string): string {
  if (!text) return text;

  // First pass: Replace using our custom EMOJI_MAP (handles Slack-specific names)
  let result = text.replace(/:([a-z0-9_+-]+):/gi, (match, emojiName) => {
    const normalizedName = emojiName.toLowerCase();
    if (EMOJI_MAP[normalizedName]) {
      return EMOJI_MAP[normalizedName];
    }
    // Keep original if not found in our map (will try node-emoji next)
    return match;
  });

  // Second pass: Use node-emoji for any remaining shortcodes
  result = emoji.emojify(result);

  return result;
}

/**
 * Get emoji by name from our map or node-emoji
 *
 * @param name - Emoji name (without colons)
 * @returns Unicode emoji or undefined if not found
 */
export function getEmoji(name: string): string | undefined {
  const normalizedName = name.toLowerCase();
  if (EMOJI_MAP[normalizedName]) {
    return EMOJI_MAP[normalizedName];
  }
  const nodeEmoji = emoji.get(`:${name}:`);
  return nodeEmoji !== `:${name}:` ? nodeEmoji : undefined;
}

/**
 * Check if text contains any emoji shortcodes
 *
 * @param text - Text to check
 * @returns true if text contains :emoji: patterns
 */
export function hasEmojiShortcodes(text: string): boolean {
  return /:([a-z0-9_+-]+):/i.test(text);
}

/**
 * Get all emoji shortcodes used in text
 *
 * @param text - Text to analyze
 * @returns Array of emoji names (without colons)
 */
export function extractEmojiShortcodes(text: string): string[] {
  const matches = text.match(/:([a-z0-9_+-]+):/gi) || [];
  return matches.map((m) => m.slice(1, -1));
}

/**
 * Common emojis for quick access in UI pickers
 */
export const COMMON_EMOJIS = [
  { code: "tada", emoji: "🎉", label: "Party" },
  { code: "fire", emoji: "🔥", label: "Fire" },
  { code: "rocket", emoji: "🚀", label: "Rocket" },
  { code: "star", emoji: "⭐", label: "Star" },
  { code: "sparkles", emoji: "✨", label: "Sparkles" },
  { code: "100", emoji: "💯", label: "100" },
  { code: "thumbsup", emoji: "👍", label: "Thumbs Up" },
  { code: "clap", emoji: "👏", label: "Clap" },
  { code: "heart", emoji: "❤️", label: "Heart" },
  { code: "wave", emoji: "👋", label: "Wave" },
  { code: "trophy", emoji: "🏆", label: "Trophy" },
  { code: "money_with_wings", emoji: "💸", label: "Money" },
  { code: "moneybag", emoji: "💰", label: "Money Bag" },
  { code: "chart_with_upwards_trend", emoji: "📈", label: "Chart Up" },
  { code: "white_check_mark", emoji: "✅", label: "Check" },
  { code: "bell", emoji: "🔔", label: "Bell" },
  { code: "calendar", emoji: "📅", label: "Calendar" },
  { code: "email", emoji: "📧", label: "Email" },
  { code: "phone", emoji: "📱", label: "Phone" },
  { code: "handshake", emoji: "🤝", label: "Handshake" },
];
