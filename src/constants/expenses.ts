// src/constants/expenses.ts

/**
 * Expense Page Constants
 *
 * All hardcoded values, colors, thresholds, and configuration for the expense page.
 * Follows the same pattern as dashboard.ts to maintain consistency.
 */

// Color Schemes for Expense Metrics
export const EXPENSE_COLORS = {
  TOTAL: '#3b82f6', // Blue
  DEDUCTIBLE: '#10b981', // Green
  PERSONAL: '#ec4899', // Pink
  BUSINESS: '#8b5cf6', // Purple
  GROWTH_POSITIVE: '#10b981', // Green (positive MoM growth)
  GROWTH_NEGATIVE: '#ef4444', // Red (negative MoM growth)
  GROWTH_NEUTRAL: '#94a3b8', // Slate (no change)
  COUNT: '#06b6d4', // Cyan
  AVERAGE: '#f59e0b', // Amber

  // Category colors (10 distinct colors for expense categories)
  CATEGORIES: [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#a855f7', // Violet
  ],
} as const;

// Status Colors for Trends
export const EXPENSE_TREND_COLORS = {
  UP: '#ef4444', // Red (expenses increasing)
  DOWN: '#10b981', // Green (expenses decreasing)
  NEUTRAL: '#94a3b8', // Slate (no significant change)
} as const;

// Gradients
export const EXPENSE_GRADIENTS = {
  DARK_SIDEBAR: 'linear-gradient(180deg, #1a1a1a 0%, #2d3748 100%)',
  LIGHT_CARD: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
  DEDUCTIBLE_HIGHLIGHT: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
} as const;

// Font Sizes
export const EXPENSE_FONT_SIZES = {
  PAGE_TITLE: '24px',
  PAGE_SUBTITLE: '14px',
  SECTION_HEADER: '13px',
  SUBSECTION_HEADER: '11px',
  STAT_LABEL: '10px',
  STAT_VALUE: '18px',
  STAT_VALUE_LARGE: '28px',
  TABLE_HEADER: '9px',
  TABLE_CELL: '11px',
  FILTER_LABEL: '10px',
  FILTER_INPUT: '11px',
  BUTTON: '11px',
  CHART_LABEL: '10px',
  CHART_VALUE: '12px',
} as const;

// Spacing
export const EXPENSE_SPACING = {
  PAGE_PADDING: '24px',
  SECTION_GAP: '16px',
  CARD_PADDING: '20px',
  CARD_GAP: '12px',
  ITEM_GAP: '8px',
  SMALL_GAP: '4px',
} as const;

// Border Radius
export const EXPENSE_BORDER_RADIUS = {
  LARGE: '12px',
  MEDIUM: '8px',
  SMALL: '6px',
  XSMALL: '4px',
} as const;

// Box Shadows
export const EXPENSE_SHADOWS = {
  CARD: '0 2px 8px rgba(0,0,0,0.06)',
  SIDEBAR: '0 4px 12px rgba(0,0,0,0.15)',
  BUTTON_HOVER: '0 2px 4px rgba(0,0,0,0.1)',
  TABLE_ROW_HOVER: '0 1px 3px rgba(0,0,0,0.08)',
} as const;

// Layout Grid
export const EXPENSE_LAYOUT = {
  MAIN_GRID: '1fr 400px', // Main content | Right sidebar
  STATS_GRID: 'repeat(auto-fit, minmax(200px, 1fr))', // Responsive stat cards
  BREAKDOWN_GRID: '1fr 1fr', // Two column for breakdown sections
  MOBILE_BREAKPOINT: '768px',
} as const;

// Typography
export const EXPENSE_TYPOGRAPHY = {
  MONO_FONT: 'Monaco, monospace',
  DEFAULT_FONT_WEIGHT: 500,
  BOLD_FONT_WEIGHT: 600,
  HEAVY_FONT_WEIGHT: 700,
} as const;

// Filter Panel Styles
export const EXPENSE_FILTER_STYLES = {
  PANEL_BG: 'linear-gradient(180deg, #1a1a1a 0%, #2d3748 100%)',
  PANEL_TEXT: '#f8f9fa',
  LABEL_COLOR: '#cbd5e0',
  INPUT_BG: '#2d3748',
  INPUT_BORDER: '#4a5568',
  INPUT_TEXT: '#f8f9fa',
  INPUT_FOCUS_BORDER: '#3b82f6',
  TOGGLE_ACTIVE: '#10b981',
  TOGGLE_INACTIVE: '#4a5568',
  BUTTON_BG: '#374151',
  BUTTON_HOVER_BG: '#4b5563',
  BUTTON_TEXT: '#f8f9fa',
} as const;

// Table Styles
export const EXPENSE_TABLE_STYLES = {
  HEADER_BG: '#f8f9fa',
  HEADER_TEXT: '#4a5568',
  HEADER_BORDER: '#e2e8f0',
  ROW_BORDER: '#f3f4f6',
  ROW_HOVER_BG: '#f8f9fa',
  CELL_TEXT: '#1a1a1a',
  CELL_TEXT_SECONDARY: '#656d76',
  ACTION_BUTTON_HOVER: '#3b82f6',
  EMPTY_STATE_TEXT: '#94a3b8',
} as const;

// Export Button Styles
export const EXPENSE_EXPORT_BUTTONS = {
  CSV_BG: '#10b981',
  CSV_HOVER_BG: '#059669',
  PDF_BG: '#ef4444',
  PDF_HOVER_BG: '#dc2626',
  TEXT_COLOR: '#ffffff',
} as const;

// Thresholds
export const EXPENSE_THRESHOLDS = {
  HIGH_GROWTH: 20, // > 20% MoM growth is significant
  LOW_GROWTH: -20, // < -20% MoM is significant decrease
  LARGE_EXPENSE: 1000, // Expenses > $1000 are considered large
} as const;

// Background Colors
export const EXPENSE_BACKGROUNDS = {
  PAGE_BG: '#f8f9fa', // Light gray background
  CARD_BG: '#ffffff', // White cards
  SIDEBAR_BG: 'linear-gradient(180deg, #1a1a1a 0%, #2d3748 100%)', // Dark sidebar
} as const;

// Chart Colors (for visualizations)
export const EXPENSE_CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#10b981',
  TERTIARY: '#f59e0b',
  GRID_LINE: '#e2e8f0',
  AXIS_TEXT: '#656d76',
  TOOLTIP_BG: '#1a1a1a',
  TOOLTIP_TEXT: '#ffffff',
} as const;

// Animation Timings
export const EXPENSE_ANIMATIONS = {
  FAST: '0.15s',
  NORMAL: '0.2s',
  SLOW: '0.3s',
  EASE: 'ease',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// Icon Sizes
export const EXPENSE_ICON_SIZES = {
  SMALL: 16,
  MEDIUM: 20,
  LARGE: 24,
} as const;

// Badge Colors
export const EXPENSE_BADGE_COLORS = {
  RECURRING: {
    BG: '#dbeafe',
    TEXT: '#1e40af',
    BORDER: '#93c5fd',
  },
  TAX_DEDUCTIBLE: {
    BG: '#d1fae5',
    TEXT: '#065f46',
    BORDER: '#6ee7b7',
  },
} as const;

// Icons (Unicode symbols for recurring and tax deductible)
export const EXPENSE_ICONS = {
  RECURRING: '↻', // Circular arrow for recurring
  TAX_DEDUCTIBLE: '📋', // Clipboard for tax records
  INFO: 'ⓘ', // Info symbol for disclaimers
} as const;
