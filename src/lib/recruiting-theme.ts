// src/lib/recruiting-theme.ts
// Utilities for applying and managing recruiting page themes

import type { RecruitingPageTheme } from "@/types/recruiting-theme.types";
import { DEFAULT_THEME } from "@/types/recruiting-theme.types";

/**
 * CSS custom property names for recruiting theme
 */
const CSS_VARS = {
  primary: "--recruiting-primary",
  primaryLight: "--recruiting-primary-light",
  primaryDark: "--recruiting-primary-dark",
  accent: "--recruiting-accent",
  accentLight: "--recruiting-accent-light",
  accentDark: "--recruiting-accent-dark",
} as const;

/**
 * Convert hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Lighten a hex color by a factor (0-1)
 */
export function lighten(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(
    rgb.r + (255 - rgb.r) * factor,
    rgb.g + (255 - rgb.g) * factor,
    rgb.b + (255 - rgb.b) * factor,
  );
}

/**
 * Darken a hex color by a factor (0-1)
 */
export function darken(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(
    rgb.r * (1 - factor),
    rgb.g * (1 - factor),
    rgb.b * (1 - factor),
  );
}

/**
 * Apply recruiting page theme to document root as CSS custom properties
 */
export function applyRecruitingTheme(theme: RecruitingPageTheme): void {
  const root = document.documentElement;

  // Primary color and variants
  const primaryColor = theme.primary_color || DEFAULT_THEME.primary_color;
  root.style.setProperty(CSS_VARS.primary, primaryColor);
  root.style.setProperty(CSS_VARS.primaryLight, lighten(primaryColor, 0.9));
  root.style.setProperty(CSS_VARS.primaryDark, darken(primaryColor, 0.2));

  // Accent color and variants
  const accentColor = theme.accent_color || DEFAULT_THEME.accent_color;
  root.style.setProperty(CSS_VARS.accent, accentColor);
  root.style.setProperty(CSS_VARS.accentLight, lighten(accentColor, 0.9));
  root.style.setProperty(CSS_VARS.accentDark, darken(accentColor, 0.2));
}

/**
 * Clear recruiting theme CSS custom properties from document root
 */
export function clearRecruitingTheme(): void {
  const root = document.documentElement;

  Object.values(CSS_VARS).forEach((cssVar) => {
    root.style.removeProperty(cssVar);
  });
}

/**
 * Apply default theme values
 */
export function applyDefaultTheme(): void {
  applyRecruitingTheme(DEFAULT_THEME);
}

/**
 * Merge partial theme with defaults
 */
export function mergeWithDefaults(
  partial: Partial<RecruitingPageTheme> | null | undefined,
): RecruitingPageTheme {
  if (!partial) return DEFAULT_THEME;

  return {
    ...DEFAULT_THEME,
    ...partial,
    social_links: {
      ...DEFAULT_THEME.social_links,
      ...(partial.social_links || {}),
    },
    enabled_features: {
      ...DEFAULT_THEME.enabled_features,
      ...(partial.enabled_features || {}),
    },
  };
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(color);
}

/**
 * Get contrasting text color (black or white) for a given background color
 */
export function getContrastingTextColor(bgHex: string): "#ffffff" | "#000000" {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "#ffffff";

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Generate inline style object for primary color usage
 */
export function getPrimaryColorStyle(
  theme: RecruitingPageTheme,
): React.CSSProperties {
  const color = theme.primary_color || DEFAULT_THEME.primary_color;
  return {
    backgroundColor: color,
    color: getContrastingTextColor(color),
  };
}

/**
 * Generate inline style object for accent color usage
 */
export function getAccentColorStyle(
  theme: RecruitingPageTheme,
): React.CSSProperties {
  const color = theme.accent_color || DEFAULT_THEME.accent_color;
  return {
    backgroundColor: color,
    color: getContrastingTextColor(color),
  };
}

/**
 * Get full recruiter name from theme
 */
export function getRecruiterFullName(theme: RecruitingPageTheme): string {
  const { recruiter_first_name, recruiter_last_name } = theme;
  if (!recruiter_first_name && !recruiter_last_name) return "";
  return `${recruiter_first_name || ""} ${recruiter_last_name || ""}`.trim();
}

/**
 * Check if theme has custom branding (not all defaults)
 */
export function hasCustomBranding(theme: RecruitingPageTheme): boolean {
  return !!(
    theme.logo_light_url ||
    theme.logo_dark_url ||
    theme.hero_image_url ||
    (theme.primary_color &&
      theme.primary_color !== DEFAULT_THEME.primary_color) ||
    (theme.accent_color && theme.accent_color !== DEFAULT_THEME.accent_color) ||
    (theme.headline && theme.headline !== DEFAULT_THEME.headline) ||
    (theme.display_name && theme.display_name !== DEFAULT_THEME.display_name)
  );
}
