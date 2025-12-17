// src/features/recruiting/pages/MyRecruitingPipeline.tsx
// Recruit's personal onboarding pipeline view

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

export function MyRecruitingPipeline() {
  const { user, loading: authLoading } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [_selectedCommunicationTab, _setSelectedCommunicationTab] = useState<
    "compose" | "inbox"
  >("compose");

  // Fetch profile directly using AuthContext's user.id
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
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
    staleTime: 1000 * 60 * 5,
  });

  const isReady =
    !authLoading && !profileLoading && !!user?.id && !!profile?.id;

  // Fetch upline/trainer info
  const { data: upline } = useQuery<UserProfile | null>({
    queryKey: ["upline", profile?.upline_id],
    queryFn: async () => {
      if (!profile?.upline_id) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, phone, profile_photo_url")
        .eq("id", profile.upline_id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: isReady && !!profile?.upline_id,
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
          <Loader2 className="h-12 w-12 animate-spin text-zinc-400 mx-auto mb-4" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
        <Card className="p-8 max-w-md text-center border-zinc-200 dark:border-zinc-800">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Error Loading Profile
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Please refresh the page to try again.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
            {String(profileError)}
          </p>
        </Card>
      </div>
    );
  }

  // No profile found
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Card className="p-8 max-w-md text-center border-zinc-200 dark:border-zinc-800">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Profile Not Found
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Please contact support for assistance.
          </p>
        </Card>
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
    (p: any) => p.id === currentPhase?.phase_id,
  );
  const currentChecklistItems = currentPhaseData?.checklist_items || [];

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-zinc-200 dark:ring-zinc-700">
            <AvatarImage
              src={profile.profile_photo_url || undefined}
              alt={profile.first_name || "User"}
            />
            <AvatarFallback className="text-sm font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
              {profile.email} · {profile.phone || "No phone"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="text-sm px-3 py-1 font-medium border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
          >
            {progressPercentage}% Complete
          </Badge>
          <label htmlFor="photo-upload">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={uploadingPhoto}
              asChild
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {uploadingPhoto ? "Uploading..." : "Update Photo"}
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
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Left Column - Current Phase & Progress */}
        <div className="col-span-2 space-y-4 overflow-auto">
          {/* Current Phase Checklist */}
          {currentPhase && template ? (
            <Card className="p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Current Phase
                  </p>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {currentPhaseData?.phase_name || "Unknown"}
                  </h2>
                </div>
                <Badge
                  variant="secondary"
                  className="text-sm px-3 py-1 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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
                <div className="py-8 text-center">
                  <Inbox className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No checklist items for this phase
                  </p>
                </div>
              )}

              {currentPhase.notes && (
                <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {currentPhase.notes}
                  </p>
                </div>
              )}

              {currentPhase.status === "blocked" &&
                currentPhase.blocked_reason && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      <span className="font-semibold">Blocked:</span>{" "}
                      {currentPhase.blocked_reason}
                    </p>
                  </div>
                )}
            </Card>
          ) : (
            <Card className="p-8 text-center border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <Circle className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No active phase
              </p>
            </Card>
          )}

          {/* Phase Progress Timeline */}
          <Card
            id="phase-progress-timeline"
            className="p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
          >
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-4">
              Onboarding Progress
            </h2>
            <div className="space-y-2">
              {phaseProgress?.map((phase) => {
                const isCompleted = phase.status === "completed";
                const isInProgress = phase.status === "in_progress";
                const isBlocked = phase.status === "blocked";
                const isExpanded = expandedPhase === phase.id;

                const phaseData = template?.phases?.find(
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
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
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
                          <ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        )}
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                        ) : isInProgress ? (
                          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                        ) : isBlocked ? (
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {phaseName}
                          </p>
                          {phase.started_at && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
                          className={`text-xs px-2 py-0.5 capitalize ${
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
                      <div className="ml-12 mt-2 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        {phaseChecklistItems.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-3">
                              Checklist Items
                            </p>
                            {phaseChecklistItems.map((item: any) => {
                              const progressItem = allChecklistProgress?.find(
                                (p: any) => p.checklist_item_id === item.id,
                              );
                              const itemCompleted =
                                progressItem?.status === "completed";

                              return (
                                <div
                                  key={item.id}
                                  className="flex items-start gap-2 py-1"
                                >
                                  {itemCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 mt-0.5" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-zinc-400 dark:text-zinc-500 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <p
                                      className={`text-sm ${itemCompleted ? "text-zinc-500 dark:text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}`}
                                    >
                                      {item.item_name}
                                    </p>
                                    {item.item_description && (
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        {item.item_description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            No checklist items for this phase
                          </p>
                        )}

                        {phase.notes && (
                          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              <span className="font-medium">Notes:</span>{" "}
                              {phase.notes}
                            </p>
                          </div>
                        )}

                        {phase.blocked_reason && (
                          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                            <p className="text-sm text-red-600 dark:text-red-400">
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
          </Card>
        </div>

        {/* Right Column - Documents & Communication */}
        <div className="space-y-4 overflow-auto">
          {/* Documents Section */}
          <Card className="p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-4">
              Required Documents
            </h2>
            <DocumentManager
              userId={profile.id}
              documents={documents}
              isUpline={false}
              currentUserId={profile.id}
            />
          </Card>

          {/* Communication Panel */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-4 pt-4">
              <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Communication
              </h2>
            </div>
            <div className="h-[420px]">
              <CommunicationPanel
                userId={profile.id}
                upline={upline}
                currentUserProfile={profile}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
