// src/features/landing/services/landingPageService.ts
// Service layer for landing page settings CRUD operations

import { supabase } from "@/services/base/supabase";
import { logger } from "@/services/base/logger";
import type {
  LandingPageSettingsRow,
  LandingPageSettingsInput,
  LandingPageTheme,
} from "../types/landing-page.types";
import { mergeWithDefaults as merge } from "../types/landing-page.types";

const TABLE_NAME = "landing_page_settings";
const STORAGE_BUCKET = "landing-page-assets";

// ===== VALIDATION HELPERS =====

function isValidHexColor(value: string | null | undefined): boolean {
  if (!value) return true;
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function isValidUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

// ===== PUBLIC API =====

// Default logo path (public folder)
const DEFAULT_LOGO = "/logos/LetterLogo.png";
const DEFAULT_PRIMARY_COLOR = "#f59e0b"; // amber-500
const DEFAULT_SECONDARY_COLOR = "#6366f1"; // indigo-500

/**
 * Get landing page settings for public display
 * Uses direct fetch with timeout to avoid React Query issues
 */
export async function getPublicLandingPageSettings(
  imoId?: string,
): Promise<LandingPageTheme> {
  try {
    // Add manual timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("RPC call timed out")), 10000);
    });

    const rpcPromise = supabase.rpc("get_public_landing_page_settings", {
      p_imo_id: imoId || null,
    });

    // Race between RPC and timeout
    const { data, error } = (await Promise.race([
      rpcPromise,
      timeoutPromise,
    ])) as Awaited<typeof rpcPromise>;

    if (error) {
      logger.error(
        "Failed to fetch public landing page settings",
        error,
        "LandingPage",
      );
      return merge(null);
    }

    // Handle the response
    let settings: Partial<LandingPageSettingsRow> | null = null;

    if (data && typeof data === "object") {
      settings = data as Partial<LandingPageSettingsRow>;
    } else if (data && typeof data === "string") {
      try {
        settings = JSON.parse(data);
      } catch {
        return merge(null);
      }
    }

    if (!settings) {
      return merge(null);
    }

    // Apply logo defaults if not set
    if (!settings.logo_light_url && !settings.logo_dark_url) {
      settings.logo_light_url = DEFAULT_LOGO;
      settings.logo_dark_url = DEFAULT_LOGO;
    }
    if (!settings.primary_color) {
      settings.primary_color = DEFAULT_PRIMARY_COLOR;
    }
    if (!settings.secondary_color) {
      settings.secondary_color = DEFAULT_SECONDARY_COLOR;
    }

    return merge(settings);
  } catch (err) {
    logger.error(
      "Exception fetching landing page settings",
      err instanceof Error ? err : String(err),
      "LandingPage",
    );
    return merge(null);
  }
}

/**
 * Get landing page settings for admin editing (requires auth)
 */
export async function getLandingPageSettings(
  imoId: string,
): Promise<LandingPageSettingsRow | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("imo_id", imoId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No row found - return null (use defaults)
        return null;
      }
      logger.error("Failed to fetch landing page settings", error);
      throw error;
    }

    return data as LandingPageSettingsRow;
  } catch (err) {
    logger.error(
      "Exception fetching landing page settings",
      err instanceof Error ? err : String(err),
    );
    throw err;
  }
}

/**
 * Create or update landing page settings
 */
export async function upsertLandingPageSettings(
  imoId: string,
  input: LandingPageSettingsInput,
): Promise<LandingPageSettingsRow> {
  // Validate colors
  if (input.primary_color && !isValidHexColor(input.primary_color)) {
    throw new Error("Invalid primary color format");
  }
  if (input.secondary_color && !isValidHexColor(input.secondary_color)) {
    throw new Error("Invalid secondary color format");
  }
  if (input.accent_color && !isValidHexColor(input.accent_color)) {
    throw new Error("Invalid accent color format");
  }

  // Validate URLs
  const urlFields = [
    "hero_video_url",
    "hero_image_url",
    "about_video_url",
    "about_image_url",
    "gallery_featured_url",
    "logo_light_url",
    "logo_dark_url",
    "og_image_url",
  ] as const;

  for (const field of urlFields) {
    const value = input[field];
    if (value && !isValidUrl(value)) {
      throw new Error(`Invalid URL for ${field}`);
    }
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert(
        {
          imo_id: imoId,
          ...input,
        },
        {
          onConflict: "imo_id",
        },
      )
      .select()
      .single();

    if (error) {
      logger.error("Failed to upsert landing page settings", error);
      throw error;
    }

    return data as LandingPageSettingsRow;
  } catch (err) {
    logger.error(
      "Exception upserting landing page settings",
      err instanceof Error ? err : String(err),
    );
    throw err;
  }
}

/**
 * Delete landing page settings (reset to defaults)
 */
export async function deleteLandingPageSettings(imoId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("imo_id", imoId);

    if (error) {
      logger.error("Failed to delete landing page settings", error);
      throw error;
    }
  } catch (err) {
    logger.error(
      "Exception deleting landing page settings",
      err instanceof Error ? err : String(err),
    );
    throw err;
  }
}

// ===== ASSET UPLOAD =====

export type AssetType =
  | "hero_image"
  | "hero_video"
  | "about_image"
  | "about_video"
  | "gallery_featured"
  | "gallery_image"
  | "logo_light"
  | "logo_dark"
  | "og_image"
  | "testimonial_image";

/**
 * Upload an asset to the landing page storage bucket
 */
export async function uploadLandingPageAsset(
  imoId: string,
  file: File,
  type: AssetType,
): Promise<string> {
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const fileName = `${imoId}/${type}_${timestamp}.${fileExt}`;

  try {
    // Upload file
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      logger.error("Failed to upload landing page asset", uploadError);
      throw uploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

    return publicUrl;
  } catch (err) {
    logger.error(
      "Exception uploading landing page asset",
      err instanceof Error ? err : String(err),
    );
    throw err;
  }
}

/**
 * Delete an asset from storage
 */
export async function deleteLandingPageAsset(url: string): Promise<void> {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/${STORAGE_BUCKET}/`);
    if (pathParts.length < 2) {
      throw new Error("Invalid asset URL");
    }
    const filePath = pathParts[1];

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      logger.error("Failed to delete landing page asset", error);
      throw error;
    }
  } catch (err) {
    logger.error(
      "Exception deleting landing page asset",
      err instanceof Error ? err : String(err),
    );
    throw err;
  }
}

/**
 * Delete all assets for an IMO
 */
export async function deleteAllLandingPageAssets(imoId: string): Promise<void> {
  try {
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(imoId);

    if (listError) {
      logger.error("Failed to list landing page assets", listError);
      throw listError;
    }

    if (files && files.length > 0) {
      const filePaths = files.map(
        (f: { name: string }) => `${imoId}/${f.name}`,
      );
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filePaths);

      if (deleteError) {
        logger.error("Failed to delete landing page assets", deleteError);
        throw deleteError;
      }
    }
  } catch (err) {
    logger.error(
      "Exception deleting all landing page assets",
      err instanceof Error ? err : String(err),
    );
    throw err;
  }
}

// ===== EXPORT SERVICE OBJECT =====

export const landingPageService = {
  getPublicSettings: getPublicLandingPageSettings,
  getSettings: getLandingPageSettings,
  upsertSettings: upsertLandingPageSettings,
  deleteSettings: deleteLandingPageSettings,
  uploadAsset: uploadLandingPageAsset,
  deleteAsset: deleteLandingPageAsset,
  deleteAllAssets: deleteAllLandingPageAssets,
};
