// src/features/settings/components/BrandingSettings.tsx
// Recruiting page branding settings UI
// Security-hardened with client-side validation for colors and URLs

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Loader2,
  Upload,
  Trash2,
  ExternalLink,
  Palette,
  Image,
  Type,
  Link2,
  Share2,
  AlertCircle,
  Info,
  LayoutGrid,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBrandingSettingsOperations } from "../hooks/useBrandingSettings";
import type {
  RecruitingPageSettingsInput,
  SocialLinks,
  EnabledFeatures,
} from "@/types/recruiting-theme.types";
import {
  COLOR_PRESETS,
  DEFAULT_THEME,
  LOGO_SIZE_MAP,
} from "@/types/recruiting-theme.types";
import { useAuth } from "@/contexts/AuthContext";
import { isValidHexColor, isValidSafeUrl } from "@/lib/recruiting-validation";

/**
 * Color picker with presets and validation
 */
function ColorPicker({
  label,
  value,
  onChange,
  presets,
  error,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presets: typeof COLOR_PRESETS.primary;
  error?: string;
}) {
  const isValid = isValidHexColor(value);

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded border cursor-pointer ${
            isValid ? "border-border" : "border-destructive"
          }`}
          style={{ backgroundColor: isValid ? value : "#ccc" }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "color";
            input.value = isValid ? value : "#000000";
            input.onchange = (e) =>
              onChange((e.target as HTMLInputElement).value);
            input.click();
          }}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className={`h-8 text-xs w-24 font-mono ${
            !isValid ? "border-destructive focus-visible:ring-destructive" : ""
          }`}
        />
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className="w-5 h-5 rounded border border-border hover:ring-2 ring-ring transition-all"
            style={{ backgroundColor: preset.value }}
            title={preset.name}
            onClick={() => onChange(preset.value)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * URL input with validation
 */
function UrlInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const isValid = !value || value.trim() === "" || isValidSafeUrl(value);

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-8 text-xs ${
          !isValid ? "border-destructive focus-visible:ring-destructive" : ""
        }`}
      />
      {!isValid && (
        <p className="text-[10px] text-destructive">
          URL must start with http:// or https://
        </p>
      )}
    </div>
  );
}

/**
 * Image upload field
 */
function ImageUpload({
  label,
  description,
  value,
  onUpload,
  onDelete,
  isUploading,
  accept = "image/*",
}: {
  label: string;
  description: string;
  value: string | null;
  onUpload: (file: File) => void;
  onDelete: () => void;
  isUploading: boolean;
  accept?: string;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <p className="text-[10px] text-muted-foreground">{description}</p>

      {value ? (
        <div className="flex items-center gap-2">
          <div className="relative w-16 h-16 rounded border border-border bg-muted overflow-hidden">
            <img
              src={value}
              alt={label}
              className="w-full h-full object-contain"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 px-3 py-2 rounded border border-dashed border-border hover:border-primary transition-colors">
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {isUploading ? "Uploading..." : "Upload image"}
              </span>
            </div>
            <input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function BrandingSettings() {
  const {
    settings,
    isLoading,
    saveSettings,
    isSaving,
    uploadAsset,
    isUploading,
    deleteAsset,
    resetToDefaults,
    isResetting,
  } = useBrandingSettingsOperations();

  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState<RecruitingPageSettingsInput>({
    layout_variant: "split-panel",
    logo_size: "medium",
    display_name: "",
    headline: "",
    subheadline: "",
    about_text: "",
    primary_color: DEFAULT_THEME.primary_color,
    accent_color: DEFAULT_THEME.accent_color,
    logo_light_url: null,
    logo_dark_url: null,
    hero_image_url: null,
    cta_text: DEFAULT_THEME.cta_text,
    calendly_url: "",
    support_phone: "",
    social_links: {},
    disclaimer_text: "",
    default_city: "",
    default_state: "",
    enabled_features: DEFAULT_THEME.enabled_features,
  });

  // Initialize form with settings when loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        layout_variant: settings.layout_variant || "split-panel",
        logo_size: settings.logo_size || "medium",
        display_name: settings.display_name || "",
        headline: settings.headline || "",
        subheadline: settings.subheadline || "",
        about_text: settings.about_text || "",
        primary_color: settings.primary_color || DEFAULT_THEME.primary_color,
        accent_color: settings.accent_color || DEFAULT_THEME.accent_color,
        logo_light_url: settings.logo_light_url,
        logo_dark_url: settings.logo_dark_url,
        hero_image_url: settings.hero_image_url,
        cta_text: settings.cta_text || DEFAULT_THEME.cta_text,
        calendly_url: settings.calendly_url || "",
        support_phone: settings.support_phone || "",
        social_links: settings.social_links || {},
        disclaimer_text: settings.disclaimer_text || "",
        default_city: settings.default_city || "",
        default_state: settings.default_state || "",
        enabled_features:
          settings.enabled_features || DEFAULT_THEME.enabled_features,
      });
    }
  }, [settings]);

  // Update form field
  const updateField = useCallback(
    <K extends keyof RecruitingPageSettingsInput>(
      field: K,
      value: RecruitingPageSettingsInput[K],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Update social link
  const updateSocialLink = useCallback(
    (platform: keyof SocialLinks, url: string) => {
      setFormData((prev) => ({
        ...prev,
        social_links: { ...prev.social_links, [platform]: url },
      }));
    },
    [],
  );

  // Update enabled feature
  const updateEnabledFeature = useCallback(
    (feature: keyof EnabledFeatures, value: boolean) => {
      setFormData((prev) => ({
        ...prev,
        enabled_features: { ...prev.enabled_features, [feature]: value },
      }));
    },
    [],
  );

  // Handle image upload
  const handleUpload = useCallback(
    async (file: File, type: "logo_light" | "logo_dark" | "hero") => {
      try {
        const url = await uploadAsset({ file, type });
        const fieldMap = {
          logo_light: "logo_light_url",
          logo_dark: "logo_dark_url",
          hero: "hero_image_url",
        } as const;
        updateField(fieldMap[type], url);
      } catch {
        // Error handled by mutation
      }
    },
    [uploadAsset, updateField],
  );

  // Handle image delete
  const handleDeleteImage = useCallback(
    async (field: "logo_light_url" | "logo_dark_url" | "hero_image_url") => {
      const url = formData[field];
      if (url) {
        try {
          await deleteAsset(url);
          updateField(field, null);
        } catch {
          // Error handled by mutation
        }
      }
    },
    [formData, deleteAsset, updateField],
  );

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validate form data
  const validateForm = useCallback((): boolean => {
    const errors: string[] = [];

    // Validate colors
    if (formData.primary_color && !isValidHexColor(formData.primary_color)) {
      errors.push("Primary color must be in #RRGGBB format");
    }
    if (formData.accent_color && !isValidHexColor(formData.accent_color)) {
      errors.push("Accent color must be in #RRGGBB format");
    }

    // Validate URLs
    if (formData.calendly_url && !isValidSafeUrl(formData.calendly_url)) {
      errors.push("Calendly URL must start with http:// or https://");
    }

    // Validate social links
    if (formData.social_links) {
      for (const [key, url] of Object.entries(formData.social_links)) {
        if (url && !isValidSafeUrl(url)) {
          errors.push(`${key} URL must start with http:// or https://`);
        }
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [formData]);

  // Check if form has validation errors (for disabling save button)
  const hasValidationErrors = useMemo(() => {
    if (formData.primary_color && !isValidHexColor(formData.primary_color))
      return true;
    if (formData.accent_color && !isValidHexColor(formData.accent_color))
      return true;
    if (formData.calendly_url && !isValidSafeUrl(formData.calendly_url))
      return true;
    if (formData.social_links) {
      for (const url of Object.values(formData.social_links)) {
        if (url && !isValidSafeUrl(url)) return true;
      }
    }
    return false;
  }, [formData]);

  // Handle save with validation
  const handleSave = useCallback(async () => {
    // Validate before saving
    if (!validateForm()) {
      return;
    }

    // Clean social links - remove empty string values
    const cleanedSocialLinks: SocialLinks = {};
    if (formData.social_links) {
      if (formData.social_links.facebook?.trim()) {
        cleanedSocialLinks.facebook = formData.social_links.facebook.trim();
      }
      if (formData.social_links.instagram?.trim()) {
        cleanedSocialLinks.instagram = formData.social_links.instagram.trim();
      }
      if (formData.social_links.linkedin?.trim()) {
        cleanedSocialLinks.linkedin = formData.social_links.linkedin.trim();
      }
      if (formData.social_links.twitter?.trim()) {
        cleanedSocialLinks.twitter = formData.social_links.twitter.trim();
      }
      if (formData.social_links.youtube?.trim()) {
        cleanedSocialLinks.youtube = formData.social_links.youtube.trim();
      }
    }

    // Clean up empty strings to null for optional fields
    const cleanedData: RecruitingPageSettingsInput = {
      ...formData,
      display_name: formData.display_name || null,
      headline: formData.headline || null,
      subheadline: formData.subheadline || null,
      about_text: formData.about_text || null,
      calendly_url: formData.calendly_url || null,
      support_phone: formData.support_phone || null,
      disclaimer_text: formData.disclaimer_text || null,
      default_city: formData.default_city || null,
      default_state: formData.default_state || null,
      // Use cleaned social links
      social_links:
        Object.keys(cleanedSocialLinks).length > 0 ? cleanedSocialLinks : {},
    };

    await saveSettings(cleanedData);
    setValidationErrors([]); // Clear errors on successful save
  }, [formData, saveSettings, validateForm]);

  // Handle reset
  const handleReset = useCallback(async () => {
    if (
      window.confirm(
        "Are you sure you want to reset all branding settings to defaults?",
      )
    ) {
      await resetToDefaults();
      setFormData({
        layout_variant: "split-panel",
        logo_size: "medium",
        display_name: "",
        headline: "",
        subheadline: "",
        about_text: "",
        primary_color: DEFAULT_THEME.primary_color,
        accent_color: DEFAULT_THEME.accent_color,
        logo_light_url: null,
        logo_dark_url: null,
        hero_image_url: null,
        cta_text: DEFAULT_THEME.cta_text,
        calendly_url: "",
        support_phone: "",
        social_links: {},
        disclaimer_text: "",
        default_city: "",
        default_state: "",
        enabled_features: DEFAULT_THEME.enabled_features,
      });
      setValidationErrors([]);
    }
  }, [resetToDefaults]);

  // Preview URL - handle missing recruiter_slug
  const recruiterSlug = user?.recruiter_slug;
  const previewUrl = recruiterSlug
    ? `${window.location.origin}/join/${recruiterSlug}`
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Recruiting Page Branding</h3>
          <p className="text-xs text-muted-foreground">
            Customize the appearance of your public recruiting page
          </p>
        </div>
        <div className="flex items-center gap-2">
          {previewUrl ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(previewUrl, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>Set your recruiting slug to preview</span>
            </div>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <ul className="list-disc list-inside space-y-0.5">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Page Layout */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Page Layout</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Choose how your recruiting page is displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Split Panel - Current/Default */}
            <button
              type="button"
              onClick={() => updateField("layout_variant", "split-panel")}
              className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                formData.layout_variant === "split-panel"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {formData.layout_variant === "split-panel" && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              {/* Split panel preview skeleton */}
              <div className="flex gap-0.5 mb-2 h-16 rounded overflow-hidden border border-border/50">
                {/* Left hero panel */}
                <div className="w-1/2 bg-foreground/90 p-1.5 flex flex-col justify-between">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{
                        backgroundColor:
                          formData.primary_color || DEFAULT_THEME.primary_color,
                      }}
                    />
                    <div className="w-6 h-1 rounded-full bg-white/40" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="w-10 h-1 rounded-full bg-white/60" />
                    <div className="w-8 h-0.5 rounded-full bg-white/30" />
                  </div>
                  <div className="w-4 h-0.5 rounded-full bg-white/20" />
                </div>
                {/* Right form panel */}
                <div className="w-1/2 bg-background p-1.5 flex flex-col items-center justify-center">
                  <div className="w-full space-y-0.5">
                    <div className="w-full h-1 rounded bg-muted" />
                    <div className="w-full h-1 rounded bg-muted" />
                    <div
                      className="w-full h-1.5 rounded"
                      style={{
                        backgroundColor:
                          formData.primary_color || DEFAULT_THEME.primary_color,
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs font-medium">Split Panel</p>
              <p className="text-[10px] text-muted-foreground">
                Hero left, form right
              </p>
            </button>

            {/* Centered Card */}
            <button
              type="button"
              onClick={() => updateField("layout_variant", "centered-card")}
              className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                formData.layout_variant === "centered-card"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {formData.layout_variant === "centered-card" && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              {/* Centered card preview skeleton */}
              <div className="h-16 rounded overflow-hidden border border-border/50 bg-gradient-to-br from-background to-muted/50 p-1.5 flex flex-col items-center">
                {/* Logo */}
                <div className="flex items-center gap-1 mb-1">
                  <div
                    className="w-2 h-2 rounded-sm"
                    style={{
                      backgroundColor:
                        formData.primary_color || DEFAULT_THEME.primary_color,
                    }}
                  />
                  <div className="w-6 h-1 rounded-full bg-foreground/30" />
                </div>
                {/* Centered form card */}
                <div className="w-10 bg-card border border-border/50 rounded p-1 shadow-sm">
                  <div className="space-y-0.5">
                    <div className="w-full h-0.5 rounded bg-muted" />
                    <div className="w-full h-0.5 rounded bg-muted" />
                    <div
                      className="w-full h-1 rounded"
                      style={{
                        backgroundColor:
                          formData.primary_color || DEFAULT_THEME.primary_color,
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs font-medium">Centered Card</p>
              <p className="text-[10px] text-muted-foreground">
                Clean & minimal
              </p>
            </button>

            {/* Hero Slide */}
            <button
              type="button"
              onClick={() => updateField("layout_variant", "hero-slide")}
              className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                formData.layout_variant === "hero-slide"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {formData.layout_variant === "hero-slide" && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              {/* Hero slide preview skeleton */}
              <div className="h-16 rounded overflow-hidden border border-border/50 bg-foreground/90 p-1.5 flex flex-col relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-auto">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{
                        backgroundColor:
                          formData.primary_color || DEFAULT_THEME.primary_color,
                      }}
                    />
                    <div className="w-5 h-1 rounded-full bg-white/40" />
                  </div>
                  <div
                    className="w-4 h-1.5 rounded"
                    style={{
                      backgroundColor:
                        formData.primary_color || DEFAULT_THEME.primary_color,
                    }}
                  />
                </div>
                {/* Center content */}
                <div className="flex flex-col items-center my-auto">
                  <div className="w-12 h-1.5 rounded-full bg-white/60 mb-0.5" />
                  <div className="w-8 h-0.5 rounded-full bg-white/30 mb-1" />
                  <div
                    className="w-6 h-2 rounded"
                    style={{
                      backgroundColor:
                        formData.primary_color || DEFAULT_THEME.primary_color,
                    }}
                  />
                </div>
                {/* Slide-in panel indicator */}
                <div className="absolute right-0 top-2 bottom-2 w-4 bg-background/90 rounded-l border-l border-border/50 flex flex-col items-center justify-center p-0.5">
                  <div className="w-2 h-0.5 rounded bg-muted" />
                  <div className="w-2 h-0.5 rounded bg-muted mt-0.5" />
                </div>
              </div>
              <p className="text-xs font-medium">Hero Slide</p>
              <p className="text-[10px] text-muted-foreground">
                Full-screen + slide form
              </p>
            </button>

            {/* Multi Section */}
            <button
              type="button"
              onClick={() => updateField("layout_variant", "multi-section")}
              className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                formData.layout_variant === "multi-section"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {formData.layout_variant === "multi-section" && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              {/* Multi-section preview skeleton */}
              <div className="h-16 rounded overflow-hidden border border-border/50 flex flex-col">
                {/* Hero section */}
                <div className="h-5 bg-foreground/90 p-1 flex items-center justify-center">
                  <div className="w-8 h-1 rounded-full bg-white/50" />
                </div>
                {/* Features section */}
                <div className="h-4 bg-background p-0.5 flex justify-center gap-1">
                  <div
                    className="w-2 h-2 rounded"
                    style={{
                      backgroundColor: `${formData.primary_color || DEFAULT_THEME.primary_color}30`,
                    }}
                  />
                  <div
                    className="w-2 h-2 rounded"
                    style={{
                      backgroundColor: `${formData.primary_color || DEFAULT_THEME.primary_color}30`,
                    }}
                  />
                  <div
                    className="w-2 h-2 rounded"
                    style={{
                      backgroundColor: `${formData.primary_color || DEFAULT_THEME.primary_color}30`,
                    }}
                  />
                </div>
                {/* Form section */}
                <div
                  className="flex-1 p-1 flex justify-center"
                  style={{
                    backgroundColor: `${formData.primary_color || DEFAULT_THEME.primary_color}08`,
                  }}
                >
                  <div className="w-8 bg-card border border-border/50 rounded p-0.5">
                    <div
                      className="w-full h-1 rounded"
                      style={{
                        backgroundColor:
                          formData.primary_color || DEFAULT_THEME.primary_color,
                      }}
                    />
                  </div>
                </div>
                {/* Footer */}
                <div className="h-2 bg-foreground/90" />
              </div>
              <p className="text-xs font-medium">Multi-Section</p>
              <p className="text-[10px] text-muted-foreground">
                Scrolling landing page
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Logo Size */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Logo Size</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Control how large your logo appears on the page
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex gap-2">
            {(["small", "medium", "large", "xlarge"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => updateField("logo_size", size)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.logo_size === size
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {formData.logo_size === size && (
                  <Check className="h-3 w-3 text-primary absolute -top-1 -right-1" />
                )}
                <div
                  className="rounded bg-muted flex items-center justify-center"
                  style={{
                    width: LOGO_SIZE_MAP[size].desktop * 0.6,
                    height: LOGO_SIZE_MAP[size].desktop * 0.6,
                    backgroundColor:
                      formData.primary_color || DEFAULT_THEME.primary_color,
                  }}
                >
                  <span className="text-white text-[8px] font-bold">
                    {LOGO_SIZE_MAP[size].desktop}px
                  </span>
                </div>
                <span className="text-xs font-medium capitalize">{size}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Display Options</CardTitle>
          <CardDescription className="text-xs">
            Control what elements appear on your recruiting page
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled_features?.show_display_name !== false}
              onChange={(e) =>
                updateEnabledFeature("show_display_name", e.target.checked)
              }
              className="rounded border-border h-4 w-4 text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium">
                Show Display Name Heading
              </span>
              <p className="text-[10px] text-muted-foreground">
                Display your agency name as a heading next to your logo
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled_features?.show_stats !== false}
              onChange={(e) =>
                updateEnabledFeature("show_stats", e.target.checked)
              }
              className="rounded border-border h-4 w-4 text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium">Show Earnings Stats</span>
              <p className="text-[10px] text-muted-foreground">
                Display the "$20,000+ average monthly commissions" highlight
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled_features?.show_about !== false}
              onChange={(e) =>
                updateEnabledFeature("show_about", e.target.checked)
              }
              className="rounded border-border h-4 w-4 text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium">Show About Section</span>
              <p className="text-[10px] text-muted-foreground">
                Display the about text on your recruiting page
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled_features?.collect_phone !== false}
              onChange={(e) =>
                updateEnabledFeature("collect_phone", e.target.checked)
              }
              className="rounded border-border h-4 w-4 text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium">Collect Phone Number</span>
              <p className="text-[10px] text-muted-foreground">
                Ask for phone number on the interest form
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Brand Identity */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Brand Identity</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Your agency name and messaging
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Display Name</Label>
              <Input
                value={formData.display_name || ""}
                onChange={(e) => updateField("display_name", e.target.value)}
                placeholder="e.g., The Standard - Tampa"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CTA Button Text</Label>
              <Input
                value={formData.cta_text || ""}
                onChange={(e) => updateField("cta_text", e.target.value)}
                placeholder="Apply Now"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Headline</Label>
            <Input
              value={formData.headline || ""}
              onChange={(e) => updateField("headline", e.target.value)}
              placeholder="Join Our Team"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Subheadline</Label>
            <Textarea
              value={formData.subheadline || ""}
              onChange={(e) => updateField("subheadline", e.target.value)}
              placeholder="Build your career in insurance"
              className="text-xs min-h-[60px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">About Text (Optional)</Label>
            <Textarea
              value={formData.about_text || ""}
              onChange={(e) => updateField("about_text", e.target.value)}
              placeholder="Tell potential recruits about your agency..."
              className="text-xs min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Default City</Label>
              <Input
                value={formData.default_city || ""}
                onChange={(e) => updateField("default_city", e.target.value)}
                placeholder="Tampa"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default State</Label>
              <Input
                value={formData.default_state || ""}
                onChange={(e) => updateField("default_state", e.target.value)}
                placeholder="FL"
                className="h-8 text-xs"
                maxLength={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Colors</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Brand colors for your recruiting page
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <ColorPicker
              label="Primary Color"
              value={formData.primary_color || DEFAULT_THEME.primary_color}
              onChange={(color) => updateField("primary_color", color)}
              presets={COLOR_PRESETS.primary}
            />
            <ColorPicker
              label="Accent Color"
              value={formData.accent_color || DEFAULT_THEME.accent_color}
              onChange={(color) => updateField("accent_color", color)}
              presets={COLOR_PRESETS.accent}
            />
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Images</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Logo and hero images (max 5MB each)
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ImageUpload
              label="Logo (Light Background)"
              description="Used on dark backgrounds. PNG or SVG recommended."
              value={formData.logo_light_url ?? null}
              onUpload={(file) => handleUpload(file, "logo_light")}
              onDelete={() => handleDeleteImage("logo_light_url")}
              isUploading={isUploading}
              accept="image/png,image/svg+xml,image/webp"
            />
            <ImageUpload
              label="Logo (Dark Background)"
              description="Used on light backgrounds. PNG or SVG recommended."
              value={formData.logo_dark_url ?? null}
              onUpload={(file) => handleUpload(file, "logo_dark")}
              onDelete={() => handleDeleteImage("logo_dark_url")}
              isUploading={isUploading}
              accept="image/png,image/svg+xml,image/webp"
            />
          </div>
          <Separator />
          <ImageUpload
            label="Hero Image (Optional)"
            description="Background image for the hero section. JPG or PNG recommended."
            value={formData.hero_image_url ?? null}
            onUpload={(file) => handleUpload(file, "hero")}
            onDelete={() => handleDeleteImage("hero_image_url")}
            isUploading={isUploading}
            accept="image/jpeg,image/png,image/webp"
          />
        </CardContent>
      </Card>

      {/* Links & Actions */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Links & Actions</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Booking and contact links
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <UrlInput
            label="Calendly URL"
            value={formData.calendly_url || ""}
            onChange={(val) => updateField("calendly_url", val)}
            placeholder="https://calendly.com/your-link"
          />
          <div className="space-y-1">
            <Label className="text-xs">Support Phone</Label>
            <Input
              value={formData.support_phone || ""}
              onChange={(e) => updateField("support_phone", e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Social Links</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Connect your social media profiles
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <UrlInput
              label="Facebook"
              value={formData.social_links?.facebook || ""}
              onChange={(val) => updateSocialLink("facebook", val)}
              placeholder="https://facebook.com/..."
            />
            <UrlInput
              label="Instagram"
              value={formData.social_links?.instagram || ""}
              onChange={(val) => updateSocialLink("instagram", val)}
              placeholder="https://instagram.com/..."
            />
            <UrlInput
              label="LinkedIn"
              value={formData.social_links?.linkedin || ""}
              onChange={(val) => updateSocialLink("linkedin", val)}
              placeholder="https://linkedin.com/in/..."
            />
            <UrlInput
              label="YouTube"
              value={formData.social_links?.youtube || ""}
              onChange={(val) => updateSocialLink("youtube", val)}
              placeholder="https://youtube.com/..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Compliance</CardTitle>
          <CardDescription className="text-xs">
            Footer disclaimer text
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Textarea
            value={formData.disclaimer_text || ""}
            onChange={(e) => updateField("disclaimer_text", e.target.value)}
            placeholder="By submitting, you agree to be contacted about career opportunities."
            className="text-xs min-h-[60px]"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isResetting}
          className="text-destructive hover:text-destructive"
        >
          {isResetting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          )}
          Reset to Defaults
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || hasValidationErrors}
          size="sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}

export default BrandingSettings;
