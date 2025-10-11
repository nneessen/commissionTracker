// src/constants/dashboard.ts

/**
 * Dashboard Constants
 *
 * All hardcoded values, colors, thresholds, and configuration for the dashboard.
 * No magic numbers should exist in component files.
 */

// Time Period Constants (imported from dateRange.ts, but referenced here for clarity)
export { DAYS_PER_PERIOD } from '../utils/dateRange';

// Color Schemes for Metrics
export const METRIC_COLORS = {
  COMMISSION_EARNED: '#10b981', // Green
  PENDING_PIPELINE: '#3b82f6', // Blue
  EXPENSES: '#f59e0b', // Orange/Amber
  NET_INCOME_POSITIVE: '#10b981', // Green
  NET_INCOME_NEGATIVE: '#ef4444', // Red
  BREAKEVEN: '#ef4444', // Red
  BREAKEVEN_MET: '#10b981', // Green
  POLICIES_NEEDED: '#8b5cf6', // Purple
  ACTIVE_POLICIES: '#06b6d4', // Cyan
  TOTAL_POLICIES: '#64748b', // Slate
  RETENTION_GOOD: '#10b981', // Green (>= 80%)
  RETENTION_WARNING: '#f59e0b', // Orange (< 80%)
  LAPSE_GOOD: '#10b981', // Green (< 10%)
  LAPSE_BAD: '#ef4444', // Red (>= 10%)
  TOTAL_CLIENTS: '#ec4899', // Pink
  POLICIES_PER_CLIENT: '#a855f7', // Purple
  AVG_PREMIUM: '#0ea5e9', // Sky blue
  AVG_COMMISSION: '#14b8a6', // Teal
  AVG_CLIENT_LTV: '#f97316', // Orange
  NEUTRAL: '#94a3b8', // Slate
} as const;

// Status Colors for Performance Table
export const STATUS_COLORS = {
  HIT: '#10b981', // >= 100%
  GOOD: '#3b82f6', // >= 75%
  FAIR: '#f59e0b', // >= 50%
  POOR: '#ef4444', // < 50%
  NEUTRAL: '#94a3b8',
} as const;

// Thresholds
export const DASHBOARD_THRESHOLDS = {
  RETENTION_GOOD: 80, // Retention >= 80% is good
  RETENTION_WARNING: 70, // Retention < 70% needs attention
  LAPSE_GOOD: 10, // Lapse rate < 10% is good
  LAPSE_WARNING: 20, // Lapse rate > 20% is concerning
  PERFORMANCE_HIT: 100, // >= 100% of target
  PERFORMANCE_GOOD: 75, // >= 75% of target
  PERFORMANCE_FAIR: 50, // >= 50% of target
} as const;

// Alert Background Colors
export const ALERT_COLORS = {
  INFO: {
    background: '#dbeafe',
    border: '#3b82f6',
    text: '#1e3a8a',
    textLight: '#1e40af',
  },
  WARNING: {
    background: '#fef3c7',
    border: '#f59e0b',
    text: '#92400e',
    textLight: '#78350f',
  },
  DANGER: {
    background: '#fed7aa',
    border: '#ea580c',
    text: '#7c2d12',
    textLight: '#7c2d12',
  },
  ERROR: {
    background: '#fee2e2',
    border: '#dc2626',
    text: '#991b1b',
    textLight: '#7f1d1d',
  },
  SUCCESS: {
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    textPrimary: '#065f46',
    textSecondary: '#047857',
  },
  WARNING_GRADIENT: {
    background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
    textPrimary: '#9a3412',
    textSecondary: '#92400e',
  },
} as const;

// Gradient Backgrounds
export const GRADIENTS = {
  DARK_SIDEBAR: 'linear-gradient(180deg, #1a1a1a 0%, #2d3748 100%)',
  DARK_BUTTON: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)',
  LIGHT_CARD: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
} as const;

// Font Sizes
export const FONT_SIZES = {
  TITLE: '20px',
  SECTION_HEADER: '13px',
  SUBSECTION_HEADER: '11px',
  STAT_LABEL: '10px',
  STAT_VALUE: '11px',
  METRIC_VALUE: '28px',
  TABLE_HEADER: '9px',
  TABLE_CELL: '11px',
  ALERT_TITLE: '10px',
  ALERT_TEXT: '9px',
  KPI_LABEL: '9px',
  KPI_VALUE: '10px',
  METADATA: '11px',
} as const;

// Spacing
export const SPACING = {
  SECTION_GAP: '16px',
  CARD_GAP: '12px',
  ITEM_GAP: '6px',
  SMALL_GAP: '4px',
} as const;

// Border Radius
export const BORDER_RADIUS = {
  LARGE: '12px',
  MEDIUM: '8px',
  SMALL: '6px',
  XSMALL: '4px',
} as const;

// Box Shadows
export const SHADOWS = {
  CARD: '0 2px 8px rgba(0,0,0,0.06)',
  SIDEBAR: '0 4px 12px rgba(0,0,0,0.15)',
  BUTTON_ACTIVE: '0 2px 4px rgba(0,0,0,0.1)',
} as const;

// Time Period Button Styles
export const TIME_PERIOD_BUTTON = {
  INACTIVE_BG: 'transparent',
  INACTIVE_COLOR: '#64748b',
  ACTIVE_BG: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)',
  ACTIVE_COLOR: '#ffffff',
  HOVER_SHADOW: '0 2px 4px rgba(0,0,0,0.1)',
} as const;

// Layout Grid
export const LAYOUT = {
  MAIN_GRID: '280px 1fr 320px',
  KPI_GRID: 'repeat(auto-fit, minmax(200px, 1fr))',
} as const;

// Quick Action Button States
export const QUICK_ACTION_BUTTON = {
  DEFAULT_BG: '#f8f9fa',
  DEFAULT_BORDER: '#e2e8f0',
  HOVER_BG: '#e2e8f0',
  HOVER_BORDER: '#cbd5e0',
  DISABLED_BG: '#f3f4f6',
  DISABLED_COLOR: '#94a3b8',
  DISABLED_OPACITY: 0.6,
} as const;

// Typography
export const TYPOGRAPHY = {
  MONO_FONT: 'Monaco, monospace',
  DEFAULT_FONT_WEIGHT: 500,
  BOLD_FONT_WEIGHT: 600,
  HEAVY_FONT_WEIGHT: 700,
} as const;
