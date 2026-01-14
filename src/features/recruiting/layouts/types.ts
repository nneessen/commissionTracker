// src/features/recruiting/layouts/types.ts
// Shared types for recruiting page layouts

import type {
  RecruitingPageTheme,
  SocialLinks,
} from "@/types/recruiting-theme.types";
import type { PublicRecruiterInfo } from "@/types/leads.types";

/**
 * Props shared across all layout components
 */
export interface LayoutProps {
  theme: RecruitingPageTheme;
  recruiterInfo: PublicRecruiterInfo;
  recruiterId: string;
  onFormSuccess: (leadId: string) => void;
}

/**
 * Social link with icon mapping
 */
export interface ActiveSocialLink {
  platform: string;
  url: string;
}

/**
 * Extract active social links from theme
 */
export function getActiveSocialLinks(
  socialLinks: SocialLinks | undefined,
): ActiveSocialLink[] {
  if (!socialLinks) return [];
  return Object.entries(socialLinks)
    .filter(([, url]) => url && url.trim() !== "")
    .map(([platform, url]) => ({ platform, url: url as string }));
}
