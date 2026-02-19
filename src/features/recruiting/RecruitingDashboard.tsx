// src/features/recruiting/RecruitingDashboard.tsx
// Redesigned with zinc palette and compact design patterns

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Mail,
  Download,
  Settings2,
  Users,
  Inbox,
  Link2,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import {
  useRecruits,
  usePendingLeadsCount,
  usePendingInvitations,
} from "./hooks";
import { useActiveTemplate, usePhases } from "./hooks/usePipeline";
import { RecruitListTable } from "./components/RecruitListTable";
import { RecruitDetailPanel } from "./components/RecruitDetailPanel";
import { AddRecruitDialog } from "./components/AddRecruitDialog";
import { SendInviteDialog } from "./components/SendInviteDialog";
import { RecruitingErrorBoundary } from "./components/RecruitingErrorBoundary";
import type { UserProfile } from "@/types/hierarchy.types";
import { useAuth } from "@/contexts/AuthContext";
import { STAFF_ONLY_ROLES } from "@/constants/roles";
import type { RecruitFilters } from "@/types/recruiting.types";
import { toast } from "sonner";
import { Link, useSearch } from "@tanstack/react-router";
import { downloadCSV } from "@/utils/exportHelpers";
import { useQuery } from "@tanstack/react-query";
// eslint-disable-next-line no-restricted-imports -- pre-existing: recruiter_slug query needs direct supabase access
import { supabase } from "@/services/base/supabase";
import { normalizePhaseNameToStatus } from "@/lib/pipeline";
import { useFeatureAccess } from "@/hooks/subscription";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { BasicRecruitingView } from "./components/BasicRecruitingView";

// Extended type for recruits with joined data
type RecruitWithRelations = UserProfile & {
  recruiter?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  } | null;
  upline?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  } | null;
};

function RecruitingDashboardContent() {
  const { user } = useAuth();

  // Detect staff role (trainer or contracting_manager)
  const isStaffRole =
    user?.roles?.some((role) =>
      STAFF_ONLY_ROLES.includes(role as (typeof STAFF_ONLY_ROLES)[number]),
    ) ?? false;

  const _isAdmin = user?.is_admin ?? false;

  // Check if user has access to custom branding features
  const { hasAccess: hasCustomBranding } = useFeatureAccess("custom_branding");

  // Build filters based on user role:
  // - Staff roles (trainer/contracting_manager): See all IMO recruits
  // - Everyone else (including is_admin): See recruits where they are recruiter OR upline
  // Note: Super admins have a separate recruiting page in the admin section
  const recruitFilters: RecruitFilters | undefined = (() => {
    if (!user?.id) return undefined;

    if (isStaffRole && user.imo_id) {
      // Staff roles (trainer, contracting_manager) see all recruits in their IMO
      return { imo_id: user.imo_id, exclude_prospects: true };
    }

    // Everyone else sees recruits where they are the recruiter OR the assigned upline
    // Note: Don't exclude prospects for personal view - recruiters need to see their newly created recruits
    return { my_recruits_user_id: user.id, exclude_prospects: false };
  })();

  const { data: recruitsData, isLoading: recruitsLoading } = useRecruits(
    recruitFilters,
    1,
    50,
    { enabled: !!user?.id },
  );

  // Fetch pending invitations (invites sent but not yet registered)
  const { data: pendingInvitations = [] } = usePendingInvitations();

  const { data: pendingLeadsCount } = usePendingLeadsCount();

  const { data: activeTemplate } = useActiveTemplate();
  const { data: pipelinePhases = [] } = usePhases(activeTemplate?.id);

  const [selectedRecruit, setSelectedRecruit] = useState<UserProfile | null>(
    null,
  );
  const [addRecruitDialogOpen, setAddRecruitDialogOpen] = useState(false);
  const [sendInviteDialogOpen, setSendInviteDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Read recruitId from URL search params (for deep linking from trainer dashboard)
  const { recruitId } = useSearch({ from: "/recruiting" });

  // Fetch current user's recruiter_slug
  const { data: recruiterSlug } = useQuery({
    queryKey: ["recruiter-slug", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("user_profiles")
        .select("recruiter_slug")
        .eq("id", user.id)
        .single();
      return data?.recruiter_slug || null;
    },
    enabled: !!user?.id,
  });

  const handleCopyLink = async () => {
    if (!recruiterSlug) return;
    const url = `https://www.thestandardhq.com/join-${recruiterSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Filter out the current user (upline) from the recruits list
  const registeredRecruits = (
    (recruitsData?.data || []) as RecruitWithRelations[]
  ).filter((recruit) => recruit.id !== user?.id);

  // Transform pending invitations (without recruit_id) into virtual recruit entries
  // These are invites sent but the recruit hasn't completed registration yet
  const invitedRecruits = pendingInvitations
    .filter((inv) => !inv.recruit_id) // Only invitations without a user yet
    .map((inv) => ({
      // Use invitation ID prefixed to avoid collision with real user IDs
      id: `invitation-${inv.id}`,
      email: inv.email,
      first_name: inv.first_name || null,
      last_name: inv.last_name || null,
      phone: inv.phone || null,
      city: inv.city || null,
      state: inv.state || null,
      onboarding_status: "invited",
      created_at: inv.created_at,
      updated_at: inv.updated_at,
      // Mark this as an invitation for special handling
      is_invitation: true,
      invitation_id: inv.id,
      invitation_status: inv.status,
      invitation_sent_at: inv.sent_at,
      // Recruiter is the inviter
      recruiter_id: inv.inviter_id,
      upline_id: inv.upline_id || inv.inviter_id,
      // Required UserProfile fields with defaults
      roles: ["recruit"],
      is_admin: false,
      imo_id: user?.imo_id || null,
      agency_id: user?.agency_id || null,
    })) as unknown as RecruitWithRelations[];

  // Combine registered recruits with pending invitations
  const recruits = useMemo(
    () => [...invitedRecruits, ...registeredRecruits],
    [invitedRecruits, registeredRecruits],
  );

  // Auto-select recruit from URL param (deep link from trainer dashboard)
  useEffect(() => {
    if (recruitId && recruits.length > 0 && !selectedRecruit) {
      const recruit = recruits.find((r) => r.id === recruitId);
      if (recruit) {
        setSelectedRecruit(recruit);
        setDetailSheetOpen(true);
      }
    }
  }, [recruitId, recruits, selectedRecruit]);

  // Calculate stats from recruits data directly
  // Active phases come from the pipeline_phases table, normalized to status keys
  const activePhaseStatuses = pipelinePhases.map((phase) =>
    normalizePhaseNameToStatus(phase.phase_name),
  );
  const stats = {
    total: recruits.length,
    active: recruits.filter((r) =>
      r.onboarding_status && activePhaseStatuses.length > 0
        ? activePhaseStatuses.includes(r.onboarding_status)
        : r.onboarding_status !== "completed" &&
          r.onboarding_status !== "dropped",
    ).length,
    completed: recruits.filter((r) => r.onboarding_status === "completed")
      .length,
    dropped: recruits.filter((r) => r.onboarding_status === "dropped").length,
  };

  const handleSelectRecruit = (recruit: UserProfile) => {
    // Allow both real recruits and pending invitations to open the detail panel
    setSelectedRecruit(recruit);
    setDetailSheetOpen(true);
  };

  const handleExportCSV = () => {
    const exportData = recruits.map((r) => ({
      Name: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : "",
      Email: r.email,
      Phone: r.phone || "",
      Status: r.onboarding_status || "",
      Recruiter:
        r.recruiter?.first_name && r.recruiter?.last_name
          ? `${r.recruiter.first_name} ${r.recruiter.last_name}`
          : r.recruiter?.email || "",
      Upline:
        r.upline?.first_name && r.upline?.last_name
          ? `${r.upline.first_name} ${r.upline.last_name}`
          : r.upline?.email || "",
      Created: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
    }));

    downloadCSV(exportData, "recruits");
    toast.success(`Exported ${recruits.length} recruits to CSV`);
  };

  const handleBulkEmail = () => {
    toast.success("Bulk email feature coming soon!");
  };

  const _handleCloseSheet = () => {
    setDetailSheetOpen(false);
  };

  const handleRecruitDeleted = () => {
    setSelectedRecruit(null);
    setDetailSheetOpen(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5">
      {/* Preview Warning Banner - shown to non-admin users */}

      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Recruiting Pipeline
            </h1>
          </div>

          {/* Inline compact stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.total}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">total</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.active}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">active</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {stats.completed}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">complete</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <span className="font-medium text-red-600 dark:text-red-400">
                {stats.dropped}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">dropped</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Leads button - hidden for staff roles (trainer/contracting_manager) */}
          {!isStaffRole && (
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="h-6 text-[10px] px-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <Link to="/recruiting/leads">
                <Inbox className="h-3 w-3 mr-1" />
                Leads
                {pendingLeadsCount && pendingLeadsCount > 0 ? (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                  >
                    {pendingLeadsCount}
                  </Badge>
                ) : null}
              </Link>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBulkEmail}
            className="h-6 text-[10px] px-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Mail className="h-3 w-3 mr-1" />
            Email
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportCSV}
            className="h-6 text-[10px] px-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSendInviteDialogOpen(true)}
            className="h-6 text-[10px] px-2"
          >
            <Mail className="h-3 w-3 mr-1" />
            Send Invite
          </Button>

          <Button
            size="sm"
            onClick={() => setAddRecruitDialogOpen(true)}
            className="h-6 text-[10px] px-2"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Add Recruit
          </Button>

          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-6 w-6 p-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Link to="/recruiting/admin/pipelines">
              <Settings2 className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Recruiting Link Banner - hidden for staff roles and requires custom_branding feature */}
      {!isStaffRole && hasCustomBranding && (
        <>
          {recruiterSlug ? (
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Your link:
                </span>
                <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-200">
                  www.thestandardhq.com/join-{recruiterSlug}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyLink}
                className="h-6 text-[10px] px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              >
                {linkCopied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] text-amber-700 dark:text-amber-300">
                  Set up your personal recruiting link to share on social media
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                asChild
                className="h-6 text-[10px] px-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              >
                <Link to="/settings">
                  Set Up Link
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          )}
        </>
      )}

      {/* Main Content - Table */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <RecruitListTable
          recruits={recruits}
          isLoading={recruitsLoading}
          selectedRecruitId={selectedRecruit?.id}
          onSelectRecruit={handleSelectRecruit}
        />
      </div>

      {/* Detail Panel as Sheet (slide-out) */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent
          side="right"
          className="w-[500px] sm:max-w-[500px] p-0 overflow-hidden"
        >
          <SheetTitle className="sr-only">Recruit Details</SheetTitle>
          <SheetDescription className="sr-only">
            View and manage recruit information, pipeline progress, and
            documents
          </SheetDescription>
          {selectedRecruit && (
            <RecruitDetailPanel
              recruit={selectedRecruit}
              currentUserId={user?.id}
              isUpline={true}
              onRecruitDeleted={handleRecruitDeleted}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add Recruit Dialog */}
      <AddRecruitDialog
        open={addRecruitDialogOpen}
        onOpenChange={setAddRecruitDialogOpen}
        onSuccess={(recruitId) => {
          const newRecruit = recruits.find((r) => r.id === recruitId);
          if (newRecruit) {
            setSelectedRecruit(newRecruit);
            setDetailSheetOpen(true);
          }
        }}
      />

      {/* Send Invite Dialog */}
      <SendInviteDialog
        open={sendInviteDialogOpen}
        onOpenChange={setSendInviteDialogOpen}
      />
    </div>
  );
}

function FreeUplineRecruitingView() {
  const { user } = useAuth();

  const recruitFilters: RecruitFilters | undefined = user?.id
    ? { my_recruits_user_id: user.id, exclude_prospects: false }
    : undefined;

  const { data: recruitsData, isLoading: recruitsLoading } = useRecruits(
    recruitFilters,
    1,
    50,
    { enabled: !!user?.id },
  );

  const { data: activeTemplate } = useActiveTemplate();
  const { data: pipelinePhases = [] } = usePhases(activeTemplate?.id);

  const [selectedRecruit, setSelectedRecruit] = useState<UserProfile | null>(
    null,
  );
  const [addRecruitDialogOpen, setAddRecruitDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Read recruitId from URL search params (for deep linking)
  const { recruitId } = useSearch({ from: "/recruiting" });

  // Filter out the current user from the recruits list
  const recruits = ((recruitsData?.data || []) as UserProfile[]).filter(
    (recruit) => recruit.id !== user?.id,
  );

  // Auto-select recruit from URL param
  useEffect(() => {
    if (recruitId && recruits.length > 0 && !selectedRecruit) {
      const recruit = recruits.find((r) => r.id === recruitId);
      if (recruit) {
        setSelectedRecruit(recruit);
        setDetailSheetOpen(true);
      }
    }
  }, [recruitId, recruits, selectedRecruit]);

  // Calculate stats
  const activePhaseStatuses = pipelinePhases.map((phase) =>
    normalizePhaseNameToStatus(phase.phase_name),
  );
  const stats = {
    total: recruits.length,
    active: recruits.filter((r) =>
      r.onboarding_status && activePhaseStatuses.length > 0
        ? activePhaseStatuses.includes(r.onboarding_status)
        : r.onboarding_status !== "completed" &&
          r.onboarding_status !== "dropped",
    ).length,
    completed: recruits.filter((r) => r.onboarding_status === "completed")
      .length,
    dropped: recruits.filter((r) => r.onboarding_status === "dropped").length,
  };

  const handleSelectRecruit = (recruit: UserProfile) => {
    setSelectedRecruit(recruit);
    setDetailSheetOpen(true);
  };

  const handleRecruitDeleted = () => {
    setSelectedRecruit(null);
    setDetailSheetOpen(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5">
      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Recruiting Pipeline
            </h1>
          </div>

          {/* Inline compact stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.total}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">total</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.active}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">active</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {stats.completed}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">complete</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <span className="font-medium text-red-600 dark:text-red-400">
                {stats.dropped}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">dropped</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <Link
            to="/billing"
            className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline mr-2"
          >
            Upgrade for full pipeline
            <ArrowRight className="inline h-3 w-3 ml-0.5" />
          </Link>
          <Button
            size="sm"
            onClick={() => setAddRecruitDialogOpen(true)}
            className="h-6 text-[10px] px-2"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Add Recruit
          </Button>
        </div>
      </div>

      {/* Main Content - Table */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <RecruitListTable
          recruits={recruits}
          isLoading={recruitsLoading}
          selectedRecruitId={selectedRecruit?.id}
          onSelectRecruit={handleSelectRecruit}
        />
      </div>

      {/* Detail Panel as Sheet (slide-out) */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent
          side="right"
          className="w-[500px] sm:max-w-[500px] p-0 overflow-hidden"
        >
          <SheetTitle className="sr-only">Recruit Details</SheetTitle>
          <SheetDescription className="sr-only">
            View and manage recruit information, pipeline progress, and
            documents
          </SheetDescription>
          {selectedRecruit && (
            <RecruitDetailPanel
              recruit={selectedRecruit}
              currentUserId={user?.id}
              isUpline={true}
              onRecruitDeleted={handleRecruitDeleted}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add Recruit Dialog */}
      <AddRecruitDialog
        open={addRecruitDialogOpen}
        onOpenChange={setAddRecruitDialogOpen}
        onSuccess={(newRecruitId) => {
          const newRecruit = recruits.find((r) => r.id === newRecruitId);
          if (newRecruit) {
            setSelectedRecruit(newRecruit);
            setDetailSheetOpen(true);
          }
        }}
      />
    </div>
  );
}

export function RecruitingDashboard() {
  // Get user info to check roles
  const { user } = useAuth();

  // Check if user is a staff role (trainer or contracting_manager)
  // Staff roles bypass subscription gating and always see the enhanced recruiting dashboard
  const isStaffRole =
    user?.roles?.some((role) =>
      STAFF_ONLY_ROLES.includes(role as (typeof STAFF_ONLY_ROLES)[number]),
    ) ?? false;

  // Check feature access levels (only needed for non-staff users)
  const { hasAccess: hasCustomPipeline, isLoading: loadingCustomPipeline } =
    useFeatureAccess("recruiting_custom_pipeline");
  const { hasAccess: hasBasicRecruiting, isLoading: loadingBasicRecruiting } =
    useFeatureAccess("recruiting_basic");

  // Check if free-tier user has their own recruits (upline access)
  const { data: ownRecruitsData, isLoading: loadingOwnRecruits } = useRecruits(
    user?.id
      ? { my_recruits_user_id: user.id, exclude_prospects: false }
      : undefined,
    1,
    1,
    {
      enabled:
        !!user?.id &&
        !isStaffRole &&
        !loadingCustomPipeline &&
        !loadingBasicRecruiting &&
        !hasCustomPipeline &&
        !hasBasicRecruiting,
    },
  );

  // Staff roles bypass all feature checks - show full dashboard immediately
  if (isStaffRole) {
    return (
      <RecruitingErrorBoundary>
        <RecruitingDashboardContent />
      </RecruitingErrorBoundary>
    );
  }

  // Show loading state while checking feature access (non-staff users only)
  if (loadingCustomPipeline || loadingBasicRecruiting) {
    return (
      <div className="flex items-center justify-center h-64 text-[11px] text-zinc-500">
        Loading...
      </div>
    );
  }

  // Full custom pipeline access - show full dashboard
  if (hasCustomPipeline) {
    return (
      <RecruitingErrorBoundary>
        <RecruitingDashboardContent />
      </RecruitingErrorBoundary>
    );
  }

  // Basic recruiting access only - show simplified view
  if (hasBasicRecruiting) {
    return (
      <RecruitingErrorBoundary>
        <BasicRecruitingView className="p-4" />
      </RecruitingErrorBoundary>
    );
  }

  // Free-tier: check if user has own recruits
  if (loadingOwnRecruits) {
    return (
      <div className="flex items-center justify-center h-64 text-[11px] text-zinc-500">
        Loading...
      </div>
    );
  }

  // Filter out the user themselves from the recruit count
  const ownRecruits = (ownRecruitsData?.data || []).filter(
    (r) => r.id !== user?.id,
  );
  if (ownRecruits.length > 0) {
    return (
      <RecruitingErrorBoundary>
        <FreeUplineRecruitingView />
      </RecruitingErrorBoundary>
    );
  }

  // No recruiting access and no recruits - show upgrade prompt
  return (
    <FeatureGate feature="recruiting_basic" promptVariant="card">
      <div />
    </FeatureGate>
  );
}
