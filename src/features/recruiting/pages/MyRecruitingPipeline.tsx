// src/features/recruiting/pages/MyRecruitingPipeline.tsx
// Recruit's personal onboarding pipeline view - full-width brutalist design

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useUplineProfile } from "@/hooks/hierarchy";
// eslint-disable-next-line no-restricted-imports -- Temporary: direct supabase access for recruit pipeline, TODO: move to service
import { supabase } from "@/services/base/supabase";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  useRecruitPhaseProgress,
  useCurrentPhase,
  useChecklistProgress,
} from "../hooks/useRecruitProgress";
import { useTemplate } from "../hooks/usePipeline";
import { PhaseChecklist } from "../components/PhaseChecklist";
import { CommunicationPanel } from "../components/CommunicationPanel";
import { useRecruitDocuments } from "../hooks/useRecruitDocuments";
import {
  WelcomeHero,
  CurrentPhaseWizard,
  NoCurrentPhase,
  OnboardingTimeline,
  ContactsSection,
  DocumentsSection,
} from "../components/onboarding";
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
  } = useQuery<UserProfile | null>({
    queryKey: ["recruit-pipeline-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !authLoading && !!user?.id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnMount: true,
  });

  const isReady =
    !authLoading && !profileLoading && !!user?.id && !!profile?.id;

  // Fetch recruit's agency name for dynamic headline
  const { data: recruitAgency } = useQuery({
    queryKey: ["recruit-agency", profile?.agency_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name")
        .eq("id", profile!.agency_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!profile?.agency_id,
  });

  // Fetch upline/trainer info
  const { data: upline } = useUplineProfile(profile?.upline_id ?? undefined, {
    enabled: isReady && !!profile?.upline_id,
  });

  // Fetch key contacts (trainers, contracting managers)
  const { data: keyContacts } = useQuery<KeyContact[]>({
    queryKey: ["key-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          "id, first_name, last_name, email, phone, profile_photo_url, roles",
        )
        .or("roles.cs.{trainer},roles.cs.{contracting_manager}");

      if (error) throw error;

      const contacts: KeyContact[] = [];

      for (const user of data || []) {
        const roles = (user.roles as string[]) || [];
        if (roles.includes("trainer")) {
          contacts.push({
            id: `${user.id}-trainer`,
            role: "trainer",
            label: "Trainer",
            profile: user as UserProfile,
          });
        }
        if (roles.includes("contracting_manager")) {
          contacts.push({
            id: `${user.id}-contracting_manager`,
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
  // Use the user's enrolled template, NOT the global default
  // This fixes "Unknown Phase" bug when user is in a non-default pipeline
  const { data: template } = useTemplate(
    profile?.pipeline_template_id ?? undefined,
  );
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
      const fileName = `${user.id}/avatar_${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("recruiting-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("recruiting-assets")
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
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <Loader2
            className="h-8 w-8 animate-spin mx-auto mb-3"
            style={{ color: "var(--recruiting-primary)" }}
          />
          <p className="text-[11px] text-white/40 font-mono uppercase tracking-wider">
            Loading your pipeline...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="p-6 max-w-sm text-center border border-white/10 rounded-lg">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-white mb-1">
            Error Loading Profile
          </h2>
          <p className="text-[11px] text-white/40 mb-2">
            Please refresh the page to try again.
          </p>
          <p className="text-[10px] text-white/20 font-mono">
            {String(profileError)}
          </p>
        </div>
      </div>
    );
  }

  // No profile found
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="p-6 max-w-sm text-center border border-white/10 rounded-lg">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-white mb-1">
            Profile Not Found
          </h2>
          <p className="text-[11px] text-white/40">
            Please contact support for assistance.
          </p>
        </div>
      </div>
    );
  }

  const progressPercentage = calculateProgress();

  // Get current phase data
  const currentPhaseIndex =
    phaseProgress?.findIndex((p) => p.phase_id === currentPhase?.phase_id) ?? 0;

  const currentPhaseData = template?.phases?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase template type
    (p: any) => p.id === currentPhase?.phase_id,
  );

  // Check if current phase is hidden from recruit
  const isCurrentPhaseHidden = currentPhaseData?.visible_to_recruit === false;

  // Filter hidden checklist items for recruit view
  const allChecklistItemsForPhase = currentPhaseData?.checklist_items || [];

  const currentChecklistItems = allChecklistItemsForPhase.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- checklist item type
    (item: any) => item.visible_to_recruit !== false,
  );

  const recruitName =
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Full-width container with responsive padding */}
      <div className="max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-6 lg:px-8 space-y-4 md:space-y-6">
        {/* Welcome Hero Banner - Full Width */}
        <WelcomeHero
          firstName={profile.first_name}
          lastName={profile.last_name}
          agencyName={recruitAgency?.name}
          profilePhotoUrl={profile.profile_photo_url}
          progressPercentage={progressPercentage}
          currentPhaseName={
            isCurrentPhaseHidden
              ? "Waiting for Admin Action"
              : currentPhaseData?.phase_name
          }
          phaseProgress={phaseProgress}
          uploadingPhoto={uploadingPhoto}
          onPhotoUpload={handlePhotoUpload}
        />

        {/* Current Phase - Full Width */}
        {currentPhase && template ? (
          <CurrentPhaseWizard
            currentPhaseName={currentPhaseData?.phase_name}
            currentPhaseId={currentPhase?.phase_id}
            currentPhaseIndex={currentPhaseIndex}
            isHidden={isCurrentPhaseHidden}
            isBlocked={currentPhase.status === "blocked"}
            blockedReason={currentPhase.blocked_reason}
            notes={currentPhase.notes}
            checklistItemCount={currentChecklistItems.length}
            completedItemCount={
              currentChecklistProgress?.filter((p) => p.status === "completed")
                .length || 0
            }
            phaseProgress={phaseProgress}
          >
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
              recruitEmail={profile.email}
              recruitName={recruitName}
            />
          </CurrentPhaseWizard>
        ) : (
          <NoCurrentPhase />
        )}

        {/* Timeline - Full Width */}
        <div id="phase-progress-timeline">
          <OnboardingTimeline
            phaseProgress={phaseProgress}
            templatePhases={template?.phases}
            allChecklistProgress={allChecklistProgress}
            expandedPhase={expandedPhase}
            onExpandedChange={setExpandedPhase}
          />
        </div>

        {/* Two-column grid for Contacts, Documents, and Communication - responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Left Column - Contacts + Documents stacked */}
          <div className="space-y-4 md:space-y-6">
            {/* Key Contacts Section */}
            <ContactsSection
              upline={upline}
              keyContacts={keyContacts}
              recruitName={recruitName}
            />

            {/* Documents Section */}
            <DocumentsSection
              userId={profile.id}
              documents={documents}
              isUpline={false}
              currentUserId={profile.id}
            />
          </div>

          {/* Right Column - Communication Panel */}
          <section className="recruiting-section recruiting-accent-top">
            <div className="relative z-10">
              <div className="px-4 pt-4 md:px-5 md:pt-5">
                <span className="recruiting-index">[06] Messages</span>
              </div>
              <div className="h-[400px] md:h-[500px] recruiting-comm-wrapper">
                <CommunicationPanel
                  userId={profile.id}
                  upline={upline}
                  currentUserProfile={profile}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
