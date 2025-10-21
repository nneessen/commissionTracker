// src/constants/componentStyles.ts

/**
 * Component Styling Constants
 *
 * Centralized constants for consistent styling across components.
 * Following React 19.1 and Tailwind CSS best practices.
 */

// Icon Sizes (for lucide-react icons)
export const ICON_SIZES = {
  XS: 'h-3 w-3',      // 12px - tiny icons
  SM: 'h-4 w-4',      // 16px - small icons, badges
  MD: 'h-5 w-5',      // 20px - default icons
  LG: 'h-6 w-6',      // 24px - larger icons, section headers
  XL: 'h-8 w-8',      // 32px - feature icons
  '2XL': 'h-12 w-12', // 48px - hero icons
} as const;

// Button Dimensions
export const BUTTON_SIZES = {
  XS: 'px-2 py-1 text-xs',
  SM: 'px-3 py-1.5 text-sm',
  MD: 'px-4 py-2 text-base',
  LG: 'px-6 py-3 text-lg',
  XL: 'px-8 py-4 text-xl',
} as const;

// Card/Panel Spacing
export const PANEL_PADDING = {
  XS: 'p-2',
  SM: 'p-3',
  MD: 'p-4',
  LG: 'p-5',
  XL: 'p-6',
} as const;

// Gap/Spacing Between Elements
export const SPACING = {
  XS: 'gap-1',    // 4px
  SM: 'gap-2',    // 8px
  MD: 'gap-3',    // 12px
  LG: 'gap-4',    // 16px
  XL: 'gap-5',    // 20px
  '2XL': 'gap-6', // 24px
} as const;

// Border Radius (Tailwind classes)
export const BORDER_RADIUS = {
  SM: 'rounded-sm',     // 2px
  DEFAULT: 'rounded',   // 4px
  MD: 'rounded-md',     // 6px
  LG: 'rounded-lg',     // 8px
  XL: 'rounded-xl',     // 12px
  '2XL': 'rounded-2xl', // 16px
  FULL: 'rounded-full', // 9999px (circle)
} as const;

// Shadow Classes
export const SHADOWS = {
  NONE: 'shadow-none',
  SM: 'shadow-sm',
  DEFAULT: 'shadow',
  MD: 'shadow-md',
  LG: 'shadow-lg',
  XL: 'shadow-xl',
} as const;

// Text Sizes
export const TEXT_SIZES = {
  XS: 'text-xs',      // 12px
  SM: 'text-sm',      // 14px
  BASE: 'text-base',  // 16px
  LG: 'text-lg',      // 18px
  XL: 'text-xl',      // 20px
  '2XL': 'text-2xl',  // 24px
  '3XL': 'text-3xl',  // 30px
} as const;

// Font Weights
export const FONT_WEIGHTS = {
  NORMAL: 'font-normal',     // 400
  MEDIUM: 'font-medium',     // 500
  SEMIBOLD: 'font-semibold', // 600
  BOLD: 'font-bold',         // 700
} as const;

// Z-Index Layers
export const Z_INDEX = {
  BEHIND: 'z-0',
  DEFAULT: 'z-10',
  DROPDOWN: 'z-20',
  STICKY: 'z-30',
  MODAL: 'z-40',
  TOOLTIP: 'z-50',
} as const;

// Animation/Transition Durations
export const TRANSITIONS = {
  FAST: 'transition-all duration-150',
  DEFAULT: 'transition-all duration-200',
  SLOW: 'transition-all duration-300',
} as const;

// Common Color Combinations
export const COLOR_SCHEMES = {
  SUCCESS: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-500',
  },
  ERROR: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-500',
  },
  WARNING: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: 'text-amber-500',
  },
  INFO: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-500',
  },
  NEUTRAL: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    icon: 'text-gray-500',
  },
} as const;

// Analytics-Specific Styles
export const ANALYTICS_STYLES = {
  CARD: {
    container: 'bg-white rounded-xl p-5 shadow-sm',
    header: 'text-sm font-semibold text-gray-900 uppercase tracking-wide mb-5',
    infoButton: 'h-6 w-6 bg-blue-50 border border-blue-100 hover:bg-blue-200 hover:scale-110 transition-transform',
  },
  INFO_PANEL: {
    container: 'bg-blue-50 border border-blue-200 p-4 rounded-lg',
    title: 'm-0 text-sm font-bold text-blue-800',
    closeButton: 'h-6 w-6 p-0 text-lg text-slate-600 hover:text-slate-900',
    proTip: 'p-2 bg-blue-100 rounded text-xs text-center text-blue-700',
  },
  STAT_CARD: {
    small: 'p-3 rounded-lg',
    medium: 'p-4 rounded-lg shadow-sm',
    label: 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5',
    value: 'text-lg font-bold font-mono',
  },
} as const;

// Grid Layouts
export const GRID_LAYOUTS = {
  AUTO_FIT_MIN_120: 'grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3',
  AUTO_FIT_MIN_140: 'grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3',
  TWO_COL: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  THREE_COL: 'grid grid-cols-1 md:grid-cols-3 gap-4',
  FOUR_COL: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
} as const;

// Export types for TypeScript
export type IconSize = typeof ICON_SIZES[keyof typeof ICON_SIZES];
export type ButtonSize = typeof BUTTON_SIZES[keyof typeof BUTTON_SIZES];
export type PanelPadding = typeof PANEL_PADDING[keyof typeof PANEL_PADDING];
export type Spacing = typeof SPACING[keyof typeof SPACING];
export type BorderRadius = typeof BORDER_RADIUS[keyof typeof BORDER_RADIUS];
export type Shadow = typeof SHADOWS[keyof typeof SHADOWS];
export type TextSize = typeof TEXT_SIZES[keyof typeof TEXT_SIZES];
export type FontWeight = typeof FONT_WEIGHTS[keyof typeof FONT_WEIGHTS];
export type ZIndex = typeof Z_INDEX[keyof typeof Z_INDEX];
export type Transition = typeof TRANSITIONS[keyof typeof TRANSITIONS];
