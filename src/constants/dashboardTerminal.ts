// src/constants/dashboardTerminal.ts

/**
 * Terminal/Console Dashboard Styling Constants
 *
 * Color scheme inspired by GitHub Dark theme with terminal aesthetics.
 * Designed for high information density and developer-friendly interface.
 */

// Terminal Color Palette
export const TERMINAL_COLORS = {
  // Background colors
  BG_MAIN: '#0d1117',           // Main background (GitHub dark)
  BG_SECTION: '#161b22',        // Section backgrounds (slightly lighter)
  BG_HOVER: '#21262d',          // Hover states
  BORDER: '#30363d',            // Border color (subtle gray)

  // Text colors
  TEXT_PRIMARY: '#c9d1d9',      // Primary text (light gray)
  TEXT_SECONDARY: '#8b949e',    // Secondary text/labels (muted gray)
  TEXT_MUTED: '#6e7681',        // Tertiary text (very muted)

  // Status colors
  SUCCESS: '#3fb950',           // Green (positive, success)
  WARNING: '#d29922',           // Yellow (warning, attention)
  DANGER: '#f85149',            // Red (danger, negative)
  INFO: '#58a6ff',              // Blue (info, neutral)
  HIGHLIGHT: '#00ff41',         // Matrix green (sparingly used)
} as const;

// Typography
export const TERMINAL_TYPOGRAPHY = {
  FONT_FAMILY: "'Fira Code', 'Courier New', Consolas, monospace",
  FONT_SIZE_XS: '11px',
  FONT_SIZE_SM: '12px',
  FONT_SIZE_BASE: '13px',
  FONT_SIZE_MD: '14px',
  FONT_SIZE_LG: '16px',
  FONT_SIZE_XL: '18px',
  LINE_HEIGHT: '1.4',
  LETTER_SPACING: '0.5px',
} as const;

// Spacing
export const TERMINAL_SPACING = {
  SECTION_PADDING: '12px',
  ROW_PADDING: '6px 12px',
  SECTION_GAP: '1px',           // Gap between sections (minimal)
  INLINE_GAP: '12px',           // Gap between inline elements
} as const;

// Border styles
export const TERMINAL_BORDERS = {
  SECTION: `1px solid ${TERMINAL_COLORS.BORDER}`,
  RADIUS: '4px',                // Minimal border radius
} as const;

// Status symbols
export const TERMINAL_SYMBOLS = {
  SUCCESS: '✓',
  ERROR: '×',
  WARNING: '⚠',
  INFO: '!',
  ARROW_RIGHT: '>',
  ARROW_UP: '↗',
  ARROW_DOWN: '↘',
  ARROW_FLAT: '→',
  BULLET: '•',
} as const;

// Button styles
export const TERMINAL_BUTTON = {
  PADDING: '6px 12px',
  BORDER: `1px solid ${TERMINAL_COLORS.BORDER}`,
  BG_DEFAULT: TERMINAL_COLORS.BG_SECTION,
  BG_HOVER: TERMINAL_COLORS.BG_HOVER,
  TEXT: TERMINAL_COLORS.TEXT_PRIMARY,
  BORDER_RADIUS: '2px',
} as const;

// Animation
export const TERMINAL_ANIMATION = {
  TRANSITION: 'all 0.15s ease',
} as const;
