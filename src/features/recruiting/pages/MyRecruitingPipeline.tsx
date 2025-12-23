// src/features/recruiting/pages/MyRecruitingPipeline.tsx
// Recruit's personal onboarding pipeline view - compact styling

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Inbox,
  AlertCircle,
  Upload,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Circle,
  Loader2,
  FileText,
  Mail,
  Phone,
  Users,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { format } from "date-fns";
import {
  useRecruitPhaseProgress,
  useCurrentPhase,
  useChecklistProgress,
} from "../hooks/useRecruitProgress";
import { useActiveTemplate } from "../hooks/usePipeline";
import { PhaseChecklist } from "../components/PhaseChecklist";
import { DocumentManager } from "../components/DocumentManager";
import { CommunicationPanel } from "../components/CommunicationPanel";
import { useRecruitDocuments } from "../hooks/useRecruitDocuments";
import type { UserProfile } from "@/types/hierarchy.types";

interface KeyContact {
  id: string;
  role: string;
  label: string;
  profile: UserProfile | null;
}

export function MyRecruitingPipeline() {
  const { user, loading: authLoading } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // Fetch profile directly using AuthContext's user.id
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery<UserProfile | null>({
    queryKey: ["recruit-pipeline-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[MyRecruitingPipeline] Profile fetch error:", error);
        throw error;
      }
      return data as UserProfile;
    },
    enabled: !authLoading && !!user?.id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 0, // Don't cache null results
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  // Force refetch when user becomes available (fixes initial load race condition)
  useEffect(() => {
    if (!authLoading && user?.id && !profile && !profileLoading) {
      console.log("[MyRecruitingPipeline] User ready, triggering profile refetch");
      refetchProfile();
    }
  }, [authLoading, user?.id, profile, profileLoading, refetchProfile]);

  const isReady =
    !authLoading && !profileLoading && !!user?.id && !!profile?.id;

  // Fetch upline/trainer info
  const { data: upline } = useQuery<UserProfile | null>({
    queryKey: ["upline", profile?.upline_id],
    queryFn: async () => {
      if (!profile?.upline_id) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, phone, profile_photo_url, roles")
        .eq("id", profile.upline_id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: isReady && !!profile?.upline_id,
  });

  // Fetch key contacts (trainers, contracting managers)
  const { data: keyContacts } = useQuery<KeyContact[]>({
    queryKey: ["key-contacts"],
    queryFn: async () => {
      // Get users with trainer or contracting_manager roles
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, phone, profile_photo_url, roles")
        .or("roles.cs.{trainer},roles.cs.{contracting_manager}");

      if (error) throw error;

      const contacts: KeyContact[] = [];

      for (const user of data || []) {
        const roles = user.roles as string[] || [];
        if (roles.includes("trainer")) {
          contacts.push({
            id: user.id,
            role: "trainer",
            label: "Trainer",
            profile: user as UserProfile,
          });
        }
        if (roles.includes("contracting_manager")) {
          contacts.push({
            id: user.id,
            role: "contracting_manager",
            label: "Contracting",
            profile: user as UserProfile,
          });
        }
      }

      return contacts;
    },
    enabled: isReady,
  });

  // Fetch phase progress
  const { data: phaseProgress } = useRecruitPhaseProgress(profile?.id);
  const { data: currentPhase } = useCurrentPhase(profile?.id);
  const { data: template } = useActiveTemplate();
  const { data: documents } = useRecruitDocuments(profile?.id);

  // Fetch all checklist progress for all phases
  const { data: allChecklistProgress } = useQuery({
    queryKey: ["all-checklist-progress", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from("recruit_checklist_progress")
        .select("*")
        .eq("user_id", profile.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Use current phase checklist for the current phase section
  const { data: currentChecklistProgress } = useChecklistProgress(
    profile?.id,
    currentPhase?.phase_id,
  );

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!phaseProgress || phaseProgress.length === 0) return 0;
    const completed = phaseProgress.filter(
      (p) => p.status === "completed",
    ).length;
    return Math.round((completed / phaseProgress.length) * 100);
  };

  // Handle photo upload
  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileName = `${user.id}_${Date.now()}.${file.name.split(".").pop()}`;
      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ profile_photo_url: urlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      window.location.reload();
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Loading state
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto mb-3" />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Loading your pipeline...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="p-4 max-w-sm text-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Error Loading Profile
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
            Please refresh the page to try again.
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            {String(profileError)}
          </p>
        </div>
      </div>
    );
  }

  // No profile found
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="p-4 max-w-sm text-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Profile Not Found
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Please contact support for assistance.
          </p>
        </div>
      </div>
    );
  }

  const progressPercentage = calculateProgress();
  const initials =
    profile.first_name && profile.last_name
      ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
      : profile.email.substring(0, 2).toUpperCase();

  // Get current phase checklist items
  const currentPhaseData = template?.phases?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase template type
    (p: any) => p.id === currentPhase?.phase_id,
  );
  const currentChecklistItems = currentPhaseData?.checklist_items || [];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "trainer":
        return GraduationCap;
      case "contracting_manager":
        return Briefcase;
      default:
        return Users;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Compact Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9 ring-1 ring-zinc-200 dark:ring-zinc-700">
              <AvatarImage
                src={profile.profile_photo_url || undefined}
                alt={profile.first_name || "User"}
              />
              <AvatarFallback className="text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {profile.first_name} {profile.last_name}
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1.5 font-medium border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
              >
                {progressPercentage}% Complete
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {profile.email}
            </p>
          </div>
        </div>

        {/* Inline stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[11px]">
            {phaseProgress && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {phaseProgress.filter((p) => p.status === "completed").length}/{phaseProgress.length}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">phases</span>
              </div>
            )}
            {documents && (
              <>
                <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-blue-500" />
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {documents.length}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">docs</span>
                </div>
              </>
            )}
          </div>

          <label htmlFor="photo-upload">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] cursor-pointer"
              disabled={uploadingPhoto}
              asChild
            >
              <span>
                <Upload className="h-3 w-3 mr-1" />
                {uploadingPhoto ? "Uploading..." : "Photo"}
              </span>
            </Button>
          </label>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-3 gap-2.5 overflow-hidden">
        {/* Left Column - Current Phase & Progress */}
        <div className="col-span-2 space-y-2.5 overflow-auto">
          {/* Current Phase Checklist */}
          {currentPhase && template ? (
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Current Phase
                  </p>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {currentPhaseData?.phase_name || "Unknown"}
                  </h2>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] h-5 px-1.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {currentChecklistItems.length > 0
                    ? `${currentChecklistProgress?.filter((p) => p.status === "completed").length || 0}/${currentChecklistItems.length} completed`
                    : "No items"}
                </Badge>
              </div>

              {currentChecklistItems.length > 0 ? (
                <PhaseChecklist
                  userId={profile.id}
                  checklistItems={currentChecklistItems}
                  checklistProgress={currentChecklistProgress || []}
                  isUpline={false}
                  currentUserId={profile.id}
                  currentPhaseId={currentPhase?.phase_id}
                  viewedPhaseId={currentPhase?.phase_id}
                  isAdmin={profile?.is_admin || false}
                  onPhaseComplete={() => {
                    const phaseProgressEl = document.getElementById(
                      "phase-progress-timeline",
                    );
                    if (phaseProgressEl) {
                      phaseProgressEl.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }}
                />
              ) : (
                <div className="py-6 text-center">
                  <Inbox className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    No checklist items for this phase
                  </p>
                </div>
              )}

              {currentPhase.notes && (
                <div className="mt-3 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-200 dark:border-zinc-700">
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    {currentPhase.notes}
                  </p>
                </div>
              )}

              {currentPhase.status === "blocked" &&
                currentPhase.blocked_reason && (
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                    <p className="text-[11px] text-red-700 dark:text-red-400">
                      <span className="font-semibold">Blocked:</span>{" "}
                      {currentPhase.blocked_reason}
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <div className="p-6 text-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg">
              <Circle className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                No active phase
              </p>
            </div>
          )}

          {/* Phase Progress Timeline */}
          <div
            id="phase-progress-timeline"
            className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg"
          >
            <h2 className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-3">
              Onboarding Progress
            </h2>
            <div className="space-y-1.5">
              {phaseProgress?.map((phase) => {
                const isCompleted = phase.status === "completed";
                const isInProgress = phase.status === "in_progress";
                const isBlocked = phase.status === "blocked";
                const isExpanded = expandedPhase === phase.id;

                const phaseData = template?.phases?.find(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase template type
                  (p: any) => p.id === phase.phase_id,
                );
                const phaseName = phaseData?.phase_name || "Unknown Phase";
                const phaseChecklistItems = phaseData?.checklist_items || [];

                return (
                  <Collapsible
                    key={phase.id}
                    open={isExpanded}
                    onOpenChange={(open) =>
                      setExpandedPhase(open ? phase.id : null)
                    }
                  >
                    <CollapsibleTrigger className="w-full">
                      <div
                        className={`flex items-center gap-2 p-2 rounded-md transition-all cursor-pointer ${
                          isCompleted
                            ? "bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
                            : isInProgress
                              ? "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                              : isBlocked
                                ? "bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50"
                                : "bg-zinc-50 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                        )}
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                        ) : isInProgress ? (
                          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                        ) : isBlocked ? (
                          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {phaseName}
                          </p>
                          {phase.started_at && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              Started{" "}
                              {format(
                                new Date(phase.started_at),
                                "MMM d, yyyy",
                              )}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            isCompleted
                              ? "default"
                              : isInProgress
                                ? "secondary"
                                : "outline"
                          }
                          className={`text-[10px] h-4 px-1.5 capitalize ${
                            isCompleted
                              ? "bg-emerald-600 text-white"
                              : isInProgress
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                : isBlocked
                                  ? "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
                                  : "border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {phase.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-9 mt-1.5 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-200 dark:border-zinc-700">
                        {phaseChecklistItems.length > 0 ? (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
                              Checklist Items
                            </p>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- checklist item type */}
                            {phaseChecklistItems.map((item: any) => {
                              const progressItem = allChecklistProgress?.find(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- progress item type
                                (p: any) => p.checklist_item_id === item.id,
                              );
                              const itemCompleted =
                                progressItem?.status === "completed";

                              return (
                                <div
                                  key={item.id}
                                  className="flex items-start gap-1.5 py-0.5"
                                >
                                  {itemCompleted ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500 mt-0.5" />
                                  ) : (
                                    <Circle className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <p
                                      className={`text-[11px] ${itemCompleted ? "text-zinc-500 dark:text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}`}
                                    >
                                      {item.item_name}
                                    </p>
                                    {item.item_description && (
                                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        {item.item_description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            No checklist items for this phase
                          </p>
                        )}

                        {phase.notes && (
                          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              <span className="font-medium">Notes:</span>{" "}
                              {phase.notes}
                            </p>
                          </div>
                        )}

                        {phase.blocked_reason && (
                          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                            <p className="text-[11px] text-red-600 dark:text-red-400">
                              <span className="font-medium">Blocked:</span>{" "}
                              {phase.blocked_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Contacts, Documents & Communication */}
        <div className="space-y-2.5 overflow-auto">
          {/* Key Contacts Section */}
          <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg">
            <h2 className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
              Key Contacts
            </h2>
            <div className="space-y-2">
              {/* Upline/Recruiter */}
              {upline && (
                <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-md">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={upline.profile_photo_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                      {upline.first_name?.[0]}{upline.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {upline.first_name} {upline.last_name}
                      </p>
                      <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        Recruiter
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a href={`mailto:${upline.email}`} className="flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                        <Mail className="h-2.5 w-2.5" />
                        Email
                      </a>
                      {upline.phone && (
                        <a href={`tel:${upline.phone}`} className="flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                          <Phone className="h-2.5 w-2.5" />
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Other key contacts */}
              {keyContacts?.map((contact) => {
                if (!contact.profile) return null;
                const Icon = getRoleIcon(contact.role);

                return (
                  <div key={contact.id} className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-md">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={contact.profile.profile_photo_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                        {contact.profile.first_name?.[0]}{contact.profile.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {contact.profile.first_name} {contact.profile.last_name}
                        </p>
                        <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          <Icon className="h-2 w-2 mr-0.5" />
                          {contact.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a href={`mailto:${contact.profile.email}`} className="flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                          <Mail className="h-2.5 w-2.5" />
                          Email
                        </a>
                        {contact.profile.phone && (
                          <a href={`tel:${contact.profile.phone}`} className="flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                            <Phone className="h-2.5 w-2.5" />
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!upline && (!keyContacts || keyContacts.length === 0) && (
                <div className="py-3 text-center">
                  <Users className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-1.5" />
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    No contacts available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Documents Section */}
          <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg">
            <h2 className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
              Required Documents
            </h2>
            <DocumentManager
              userId={profile.id}
              documents={documents}
              isUpline={false}
              currentUserId={profile.id}
            />
          </div>

          {/* Communication Panel */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg overflow-hidden">
            <div className="px-3 pt-2">
              <h2 className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Communication
              </h2>
            </div>
            <div className="h-[320px]">
              <CommunicationPanel
                userId={profile.id}
                upline={upline}
                currentUserProfile={profile}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
