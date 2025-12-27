// src/services/recruiting/videoEmbedService.ts

import type {
  VideoPlatform,
  VideoEmbedMetadata,
} from "@/types/recruiting.types";

/**
 * Video Embed Service
 *
 * Handles video URL validation, platform detection, video ID extraction,
 * and embed URL generation for YouTube, Vimeo, and Loom.
 *
 * Security: Always validates URLs and extracts IDs to prevent XSS.
 * Never renders raw user-provided URLs in iframes.
 */
export const videoEmbedService = {
  /**
   * Detect video platform from URL
   * @param url - Video URL to analyze
   * @returns Platform type or null if not recognized
   */
  detectPlatform(url: string): VideoPlatform | null {
    if (!url) return null;

    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
        return "youtube";
      }
      if (hostname.includes("vimeo.com")) {
        return "vimeo";
      }
      if (hostname.includes("loom.com")) {
        return "loom";
      }

      return null;
    } catch {
      return null;
    }
  },

  /**
   * Extract video ID from URL based on platform
   * @param url - Video URL
   * @param platform - Video platform
   * @returns Extracted video ID or null if not found
   */
  extractVideoId(url: string, platform: VideoPlatform): string | null {
    try {
      const parsed = new URL(url);

      switch (platform) {
        case "youtube": {
          // Handle youtube.com/watch?v=... and youtu.be/...
          if (parsed.hostname.includes("youtu.be")) {
            // youtu.be/VIDEO_ID
            const id = parsed.pathname.slice(1); // Remove leading /
            return id || null;
          }
          // youtube.com/watch?v=VIDEO_ID
          return parsed.searchParams.get("v");
        }

        case "vimeo": {
          // Handle vimeo.com/123456789
          const match = parsed.pathname.match(/\/(\d+)/);
          return match ? match[1] : null;
        }

        case "loom": {
          // Handle loom.com/share/VIDEO_ID
          const match = parsed.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
          return match ? match[1] : null;
        }

        default:
          return null;
      }
    } catch {
      return null;
    }
  },

  /**
   * Get embed URL for iframe
   * @param videoId - Extracted video ID
   * @param platform - Video platform
   * @returns Embed URL safe for iframe src
   */
  getEmbedUrl(videoId: string, platform: VideoPlatform): string {
    const encodedId = encodeURIComponent(videoId);
    switch (platform) {
      case "youtube":
        // enablejsapi=1 allows JavaScript API control for tracking
        return `https://www.youtube.com/embed/${encodedId}?enablejsapi=1&rel=0`;
      case "vimeo":
        // dnt=1 disables tracking, respects user privacy
        return `https://player.vimeo.com/video/${encodedId}?dnt=1`;
      case "loom":
        return `https://www.loom.com/embed/${encodedId}`;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  },

  /**
   * Validate video URL format and content
   * @param url - Video URL to validate
   * @returns true if valid, false otherwise
   */
  isValidVideoUrl(url: string): boolean {
    // Must be non-empty string
    if (!url || typeof url !== "string") return false;

    // Must be valid URL
    try {
      const parsed = new URL(url);
      // Must be HTTPS for security
      if (parsed.protocol !== "https:") return false;
    } catch {
      return false;
    }

    // Must match a supported platform
    const platform = this.detectPlatform(url);
    if (!platform) return false;

    // Must have extractable video ID
    const videoId = this.extractVideoId(url, platform);
    return !!videoId;
  },

  /**
   * Parse video URL into metadata object
   * @param url - Video URL to parse
   * @returns VideoEmbedMetadata or null if invalid
   */
  parseVideoUrl(url: string): VideoEmbedMetadata | null {
    const platform = this.detectPlatform(url);
    if (!platform) return null;

    const videoId = this.extractVideoId(url, platform);
    if (!videoId) return null;

    return {
      platform,
      video_url: url,
      video_id: videoId,
    };
  },

  /**
   * Validate video URL and return error message if invalid
   * @param url - Video URL to validate
   * @returns Object with valid flag and optional error message
   */
  validateVideoUrl(url: string): { valid: boolean; error?: string } {
    // Check if empty
    if (!url || !url.trim()) {
      return { valid: false, error: "Video URL is required" };
    }

    // Check if valid URL format
    try {
      new URL(url);
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }

    // Check if HTTPS
    if (!url.startsWith("https://")) {
      return { valid: false, error: "URL must use HTTPS" };
    }

    // Check if supported platform
    const platform = this.detectPlatform(url);
    if (!platform) {
      return {
        valid: false,
        error: "URL must be from YouTube, Vimeo, or Loom",
      };
    }

    // Check if video ID can be extracted
    const videoId = this.extractVideoId(url, platform);
    if (!videoId) {
      return {
        valid: false,
        error: "Could not extract video ID from URL",
      };
    }

    return { valid: true };
  },
};
