// src/features/settings/components/UserProfile.tsx
// Redesigned with zinc palette and compact design patterns

import React, { useState, useEffect } from "react";
import {
  User,
  Save,
  AlertCircle,
  CheckCircle2,
  Users,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "../../../contexts/AuthContext";
import { useUpdateUserProfile } from "../../../hooks/settings/useUpdateUserProfile";
import { useUpdateAgentHierarchy } from "../../../hooks/hierarchy/useUpdateAgentHierarchy";
import { supabase } from "@/services/base/supabase";
import { getDisplayName } from "../../../types/user.types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RoleName } from "@/types/permissions.types";

export function UserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateProfile = useUpdateUserProfile();
  const updateHierarchy = useUpdateAgentHierarchy();

  // Check user roles to determine if they are staff-only (no commission settings needed)
  const { data: userRoleData } = useQuery({
    queryKey: ["profile-user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("roles, is_admin")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as { roles: RoleName[]; is_admin: boolean | null };
    },
    enabled: !!user?.id,
  });

  const hasRole = (role: RoleName) =>
    userRoleData?.roles?.includes(role) || false;

  // Staff-only: has trainer/contracting_manager but NOT agent/admin
  // These users don't need commission settings
  const isStaffOnly =
    (hasRole("trainer" as RoleName) ||
      hasRole("contracting_manager" as RoleName)) &&
    !hasRole("agent" as RoleName) &&
    !hasRole("admin" as RoleName) &&
    !userRoleData?.is_admin;

  const [contractLevel, setContractLevel] = useState<string>("");
  const [uplineEmail, setUplineEmail] = useState<string>("");
  const [currentUplineEmail, setCurrentUplineEmail] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const [uplineError, setUplineError] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUplineSuccess, setShowUplineSuccess] = useState(false);

  // Recruiter slug state
  const [recruiterSlug, setRecruiterSlug] = useState<string>("");
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [slugError, setSlugError] = useState<string>("");
  const [showSlugSuccess, setShowSlugSuccess] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);

  // Custom recruiting URL state
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [customRecruitingUrl, setCustomRecruitingUrl] = useState<string>("");
  const [savedCustomUrl, setSavedCustomUrl] = useState<string>("");
  const [customUrlError, setCustomUrlError] = useState<string>("");
  const [showCustomUrlSuccess, setShowCustomUrlSuccess] = useState(false);
  const [customUrlCopied, setCustomUrlCopied] = useState(false);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  // Load current user profile data on mount
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!user?.id) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select(
          "upline_id, recruiter_slug, contract_level, custom_recruiting_url",
        )
        .eq("id", user.id)
        .single();

      // Load contract level from DB (source of truth)
      if (
        profile?.contract_level !== undefined &&
        profile?.contract_level !== null
      ) {
        setContractLevel(profile.contract_level.toString());
      } else {
        setContractLevel("100"); // Default if not set in DB
      }

      // Load recruiter slug
      if (profile?.recruiter_slug) {
        setCurrentSlug(profile.recruiter_slug);
        setRecruiterSlug(profile.recruiter_slug);
      }

      // Load custom recruiting URL
      if (profile?.custom_recruiting_url) {
        setSavedCustomUrl(profile.custom_recruiting_url);
        setCustomRecruitingUrl(profile.custom_recruiting_url);
        setUseCustomUrl(true);
      }

      // Load upline info
      if (profile?.upline_id) {
        const { data: upline } = await supabase
          .from("user_profiles")
          .select("email")
          .eq("id", profile.upline_id)
          .single();

        if (upline?.email) {
          setCurrentUplineEmail(upline.email);
          setUplineEmail(upline.email);
        }
      }
    };

    loadUserInfo();
  }, [user?.id]);

  const validateContractLevel = (value: string): boolean => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setValidationError("Contract level must be a number");
      return false;
    }
    if (num < 80 || num > 145) {
      setValidationError("Contract level must be between 80 and 145");
      return false;
    }
    setValidationError("");
    return true;
  };

  const handleContractLevelChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setContractLevel(value);
    setShowSuccess(false);
    validateContractLevel(value);
  };

  const handleUplineEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUplineEmail(e.target.value);
    setUplineError("");
    setShowUplineSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(false);

    if (!validateContractLevel(contractLevel)) {
      return;
    }

    try {
      await updateProfile.mutateAsync({
        contract_level: parseInt(contractLevel, 10),
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update contract level:", error);
    }
  };

  const handleUplineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowUplineSuccess(false);
    setUplineError("");

    if (!user?.id) return;

    // Allow clearing upline by submitting empty email
    if (!uplineEmail.trim()) {
      try {
        await updateHierarchy.mutateAsync({
          agent_id: user.id,
          new_upline_id: null,
        });
        setCurrentUplineEmail("");
        setShowUplineSuccess(true);
        setTimeout(() => setShowUplineSuccess(false), 3000);
        return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
      } catch (error: any) {
        setUplineError(error.message || "Failed to remove upline");
        return;
      }
    }

    // Validate upline email exists
    try {
      const { data: upline, error } = await supabase
        .from("user_profiles")
        .select("id, email")
        .eq("email", uplineEmail.trim())
        .single();

      if (error || !upline) {
        setUplineError("No user found with that email address");
        return;
      }

      if (upline.id === user.id) {
        setUplineError("You cannot set yourself as your own upline");
        return;
      }

      // Update hierarchy
      await updateHierarchy.mutateAsync({
        agent_id: user.id,
        new_upline_id: upline.id,
      });

      setCurrentUplineEmail(upline.email);
      setShowUplineSuccess(true);
      setTimeout(() => setShowUplineSuccess(false), 3000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
    } catch (error: any) {
      setUplineError(error.message || "Failed to update upline");
    }
  };

  // Slug validation and handlers
  const validateSlug = (value: string): boolean => {
    if (!value.trim()) {
      setSlugError("Please enter a URL slug");
      return false;
    }
    if (value.length < 3) {
      setSlugError("Slug must be at least 3 characters");
      return false;
    }
    if (value.length > 50) {
      setSlugError("Slug must be 50 characters or less");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      setSlugError("Only lowercase letters, numbers, and hyphens allowed");
      return false;
    }
    if (value.startsWith("-") || value.endsWith("-")) {
      setSlugError("Slug cannot start or end with a hyphen");
      return false;
    }
    setSlugError("");
    return true;
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setRecruiterSlug(value);
    setShowSlugSuccess(false);
    if (value) validateSlug(value);
  };

  const handleSlugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSlugSuccess(false);
    setSlugError("");

    if (!validateSlug(recruiterSlug)) {
      return;
    }

    try {
      // Check if slug is already taken (use maybeSingle to avoid error on 0 rows)
      const { data: existing, error: checkError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("recruiter_slug", recruiterSlug)
        .neq("id", user?.id || "")
        .maybeSingle();

      if (checkError) {
        console.error("Error checking slug:", checkError);
        setSlugError("Failed to check availability. Please try again.");
        return;
      }

      if (existing) {
        setSlugError("This URL is already taken. Try a different one.");
        return;
      }

      // Update directly via supabase since userService may have issues
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ recruiter_slug: recruiterSlug })
        .eq("id", user?.id || "");

      if (updateError) {
        console.error("Error updating slug:", updateError);
        setSlugError("Failed to save. Please try again.");
        return;
      }

      // Invalidate cache so other components get updated slug
      await queryClient.invalidateQueries({ queryKey: ["recruiter-slug"] });

      setCurrentSlug(recruiterSlug);
      setShowSlugSuccess(true);
      setTimeout(() => setShowSlugSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update recruiter slug:", error);
      setSlugError("Failed to save. Please try again.");
    }
  };

  const handleCopyLink = async () => {
    const url =
      savedCustomUrl || `https://www.thestandardhq.com/join-${currentSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      if (savedCustomUrl) {
        setCustomUrlCopied(true);
        setTimeout(() => setCustomUrlCopied(false), 2000);
      } else {
        setSlugCopied(true);
        setTimeout(() => setSlugCopied(false), 2000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Custom URL validation and handlers
  const validateCustomUrl = (value: string): boolean => {
    if (!value.trim()) {
      setCustomUrlError("Please enter a URL");
      return false;
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") {
        setCustomUrlError("URL must use HTTPS");
        return false;
      }
      setCustomUrlError("");
      return true;
    } catch {
      setCustomUrlError("Please enter a valid URL (e.g., https://example.com)");
      return false;
    }
  };

  const handleCustomUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomRecruitingUrl(value);
    setShowCustomUrlSuccess(false);
    if (value) validateCustomUrl(value);
    else setCustomUrlError("");
  };

  const handleCustomUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowCustomUrlSuccess(false);
    setCustomUrlError("");

    if (!validateCustomUrl(customRecruitingUrl)) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ custom_recruiting_url: customRecruitingUrl })
        .eq("id", user?.id || "");

      if (updateError) {
        console.error("Error updating custom URL:", updateError);
        setCustomUrlError("Failed to save. Please try again.");
        return;
      }

      setSavedCustomUrl(customRecruitingUrl);
      setShowCustomUrlSuccess(true);
      setTimeout(() => setShowCustomUrlSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update custom recruiting URL:", error);
      setCustomUrlError("Failed to save. Please try again.");
    }
  };

  const handleClearCustomUrl = async () => {
    try {
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ custom_recruiting_url: null })
        .eq("id", user?.id || "");

      if (updateError) {
        console.error("Error clearing custom URL:", updateError);
        return;
      }

      setSavedCustomUrl("");
      setCustomRecruitingUrl("");
      setUseCustomUrl(false);
      setShowSetupInstructions(false);
    } catch (error) {
      console.error("Failed to clear custom recruiting URL:", error);
    }
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-center text-[11px] text-zinc-500 dark:text-zinc-400">
          Loading user information...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* User Information Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <User className="h-3.5 w-3.5 text-zinc-400" />
          <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            User Profile
          </h3>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                Email
              </label>
              <div className="px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded text-[11px] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                Name
              </label>
              <div className="px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded text-[11px] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {user.first_name && user.last_name
                  ? getDisplayName({
                      first_name: user.first_name,
                      last_name: user.last_name,
                      email: user.email || "",
                    })
                  : "Not set"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Recruiting Link Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <Link2 className="h-3.5 w-3.5 text-zinc-400" />
          <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            Personal Recruiting Link
          </h3>
        </div>
        <div className="p-3">
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">
            Create your personal recruiting URL to share on social media.
            Prospects who submit through your link will appear in your leads
            queue.
          </p>

          {/* Show current link if set */}
          {(currentSlug || savedCustomUrl) && (
            <div className="mb-3 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">
                    Your recruiting link{savedCustomUrl ? " (custom)" : ""}:
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono truncate">
                    {savedCustomUrl ||
                      `www.thestandardhq.com/join-${currentSlug}`}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="h-7 px-2 text-[10px] border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex-shrink-0"
                >
                  {(savedCustomUrl ? customUrlCopied : slugCopied) ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleSlugSubmit}>
            <div className="max-w-md">
              <label
                htmlFor="recruiterSlug"
                className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1"
              >
                {currentSlug ? "Change URL Slug" : "Choose Your URL Slug"}
              </label>
              <div className="flex gap-2 items-center">
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                  /join-
                </span>
                <Input
                  id="recruiterSlug"
                  type="text"
                  value={recruiterSlug}
                  onChange={handleSlugChange}
                  placeholder="john-smith"
                  className={`h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 ${
                    slugError ? "border-red-500" : ""
                  }`}
                />
                <Button
                  type="submit"
                  disabled={updateProfile.isPending || !!slugError}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px] border-zinc-200 dark:border-zinc-700"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {updateProfile.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
              {slugError && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {slugError}
                </div>
              )}
              {showSlugSuccess && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Recruiting link saved successfully!
                </div>
              )}
              <p className="mt-1.5 text-[9px] text-zinc-400 dark:text-zinc-500">
                Use lowercase letters, numbers, and hyphens only. Example:
                john-smith, jsmith2025
              </p>
            </div>
          </form>

          {/* Custom Domain Section */}
          <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                  Use Custom Domain
                </span>
              </div>
              <Switch
                checked={useCustomUrl}
                onCheckedChange={(checked) => {
                  setUseCustomUrl(checked);
                  if (!checked) {
                    handleClearCustomUrl();
                  }
                }}
              />
            </div>

            {useCustomUrl && (
              <>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">
                  Enter the full URL you want displayed. You are responsible for
                  setting up the redirect on your domain.
                </p>

                <form onSubmit={handleCustomUrlSubmit}>
                  <div className="max-w-md">
                    <label
                      htmlFor="customRecruitingUrl"
                      className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1"
                    >
                      Custom URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="customRecruitingUrl"
                        type="url"
                        value={customRecruitingUrl}
                        onChange={handleCustomUrlChange}
                        placeholder="https://join.youragency.com/apply"
                        className={`h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 ${
                          customUrlError ? "border-red-500" : ""
                        }`}
                      />
                      <Button
                        type="submit"
                        disabled={!!customUrlError}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px] border-zinc-200 dark:border-zinc-700"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    </div>
                    {customUrlError && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        {customUrlError}
                      </div>
                    )}
                    {showCustomUrlSuccess && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Custom URL saved successfully!
                      </div>
                    )}
                  </div>
                </form>

                {/* Setup Instructions */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setShowSetupInstructions(!showSetupInstructions)
                    }
                    className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Info className="h-3 w-3" />
                    {showSetupInstructions ? "Hide" : "View"} setup instructions
                  </button>

                  {showSetupInstructions && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-[10px] font-medium text-blue-700 dark:text-blue-300 mb-1.5">
                        How to set up your custom domain:
                      </p>
                      <ol className="text-[9px] text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                        <li>
                          Purchase a domain from any registrar (GoDaddy,
                          Namecheap, Cloudflare, etc.)
                        </li>
                        <li>
                          Set up a redirect in your registrar's DNS settings:
                          <br />
                          <span className="font-mono ml-3">
                            your-domain.com → www.thestandardhq.com/join-
                            {currentSlug || "your-slug"}
                          </span>
                        </li>
                        <li>Enter your custom URL above and save</li>
                        <li>
                          Test by visiting your custom domain in a browser
                        </li>
                      </ol>
                      <p className="text-[9px] text-blue-500 dark:text-blue-400 mt-1.5 italic">
                        Most registrars offer free URL forwarding. Look for "URL
                        redirect" or "forwarding" in DNS settings.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Team Hierarchy Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <Users className="h-3.5 w-3.5 text-zinc-400" />
          <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            Team Hierarchy
          </h3>
        </div>
        <div className="p-3">
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">
            Specify who your upline is. This determines who earns override
            commissions on your policies.
            {currentUplineEmail && (
              <span className="block mt-1 text-zinc-700 dark:text-zinc-300 font-medium">
                Current upline: {currentUplineEmail}
              </span>
            )}
          </p>

          <form onSubmit={handleUplineSubmit}>
            <div className="max-w-md">
              <label
                htmlFor="uplineEmail"
                className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1"
              >
                Upline Email (leave blank to remove)
              </label>
              <div className="flex gap-2">
                <Input
                  id="uplineEmail"
                  type="email"
                  value={uplineEmail}
                  onChange={handleUplineEmailChange}
                  placeholder="upline@example.com"
                  className={`h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 ${
                    uplineError ? "border-red-500" : ""
                  }`}
                />
                <Button
                  type="submit"
                  disabled={updateHierarchy.isPending}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px] border-zinc-200 dark:border-zinc-700"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {updateHierarchy.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
              {uplineError && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {uplineError}
                </div>
              )}
              {showUplineSuccess && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Upline updated successfully!
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Commission Settings Card - Only show for agents, not staff */}
      {!isStaffOnly && (
        <>
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                Commission Settings
              </h3>
            </div>
            <div className="p-3">
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">
                Your contract level determines your commission rates. This
                setting only affects new commissions and does not change
                existing policies or commission calculations.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="max-w-xs">
                  <label
                    htmlFor="contractLevel"
                    className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1"
                  >
                    Contract Level (80-145)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="contractLevel"
                      type="number"
                      min="80"
                      max="145"
                      value={contractLevel}
                      onChange={handleContractLevelChange}
                      className={`h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 w-24 ${
                        validationError ? "border-red-500" : ""
                      }`}
                    />
                    <Button
                      type="submit"
                      disabled={updateProfile.isPending || !!validationError}
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {updateProfile.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  {validationError && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      {validationError}
                    </div>
                  )}
                  {showSuccess && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Contract level updated successfully!
                    </div>
                  )}
                  {updateProfile.isError && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      Failed to update contract level
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-[10px]">
                <p className="font-medium text-blue-700 dark:text-blue-300 mb-0.5">
                  About Contract Levels
                </p>
                <p className="text-blue-600 dark:text-blue-400">
                  Your contract level represents your commission tier with
                  insurance carriers. Higher levels typically earn higher
                  commission percentages. When you create new policies or
                  commissions, your current contract level will be used to
                  calculate your earnings from the comp guide.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
