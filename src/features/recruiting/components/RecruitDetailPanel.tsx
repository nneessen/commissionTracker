// src/features/recruiting/components/RecruitDetailPanel.tsx

import React, { useState } from 'react';
import {UserProfile} from '@/types/hierarchy.types';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Mail, Phone, FileText, Activity, ArrowRight, AlertCircle, User, Instagram, Linkedin, Trash2} from 'lucide-react';
import {DeleteRecruitDialogOptimized} from './DeleteRecruitDialog.optimized';
import {useRouter} from '@tanstack/react-router';
import {PhaseTimeline} from './PhaseTimeline';
import {PhaseChecklist} from './PhaseChecklist';
import {DocumentManager} from './DocumentManager';
import {EmailManager} from './EmailManager';
import {useRecruitPhaseProgress, useCurrentPhase, useChecklistProgress, useAdvancePhase, useBlockPhase, useUpdatePhaseStatus, useInitializeRecruitProgress} from '../hooks/useRecruitProgress';
import {useActiveTemplate} from '../hooks/usePipeline';
import {useCurrentUserProfile} from '@/hooks/admin/useUserApproval';

import {useRecruitDocuments} from '../hooks/useRecruitDocuments';
import {useRecruitEmails} from '../hooks/useRecruitEmails';
import {useRecruitActivityLog} from '../hooks/useRecruitActivity';
import {ONBOARDING_STATUS_COLORS} from '@/types/recruiting.types';

// Default pipeline template ID (from seed migration)
const DEFAULT_TEMPLATE_ID = '00000000-0000-0000-0000-000000000001';

interface RecruitDetailPanelProps {
  recruit: UserProfile;
  currentUserId?: string;
  isUpline?: boolean;
  onRecruitDeleted?: () => void;
}

export function RecruitDetailPanel({ recruit, currentUserId, isUpline = false, onRecruitDeleted }: RecruitDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('progress');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const _router = useRouter();

  // Get current user profile to check roles
  const { data: currentUserProfile } = useCurrentUserProfile();

  // Fetch recruit's progress data
  const { data: phaseProgress, isLoading: progressLoading } = useRecruitPhaseProgress(recruit.id);
  const { data: currentPhase, isLoading: currentPhaseLoading } = useCurrentPhase(recruit.id);
  const { data: template, isLoading: templateLoading } = useActiveTemplate();
  const { data: checklistProgress, isLoading: _checklistLoading } = useChecklistProgress(
    recruit.id,
    selectedPhaseId || currentPhase?.phase_id
  );
  const { data: documents } = useRecruitDocuments(recruit.id);
  const { data: emails } = useRecruitEmails(recruit.id);
  const { data: activityLog } = useRecruitActivityLog(recruit.id);

  // Mutations
  const advancePhase = useAdvancePhase();
  const blockPhase = useBlockPhase();
  const updatePhaseStatus = useUpdatePhaseStatus();
  const initializeProgress = useInitializeRecruitProgress();

  const handleAdvancePhase = async () => {
    if (!currentPhase) return;
    if (!confirm('Are you sure you want to advance this recruit to the next phase?')) return;

    await advancePhase.mutateAsync({
      userId: recruit.id,
      currentPhaseId: currentPhase.phase_id,
    });
  };

  const handleBlockPhase = async () => {
    if (!currentPhase) return;
    const reason = prompt('Please enter the reason for blocking:');
    if (!reason) return;

    await blockPhase.mutateAsync({
      userId: recruit.id,
      phaseId: currentPhase.phase_id,
      reason,
    });
  };

  const handleUnblockPhase = async () => {
    if (!currentPhase) return;
    if (!confirm('Are you sure you want to unblock this phase and resume progress?')) return;

    await updatePhaseStatus.mutateAsync({
      userId: recruit.id,
      phaseId: currentPhase.phase_id,
      status: 'in_progress',
      notes: 'Unblocked by admin',
    });
  };

  const handlePhaseClick = (phaseId: string) => {
    setSelectedPhaseId(phaseId);
    setActiveTab('checklist'); // Auto-switch to checklist tab
  };

  const handleDeleteSuccess = () => {
    // Call parent callback to clear the selection
    onRecruitDeleted?.();
  };

  const isLoading = progressLoading || currentPhaseLoading || templateLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleInitializeProgress = async () => {
    await initializeProgress.mutateAsync({
      userId: recruit.id,
      templateId: DEFAULT_TEMPLATE_ID,
    });
  };

  // Handle case where recruit has no phase progress - but still show full UI
  const hasPipelineProgress = phaseProgress && phaseProgress.length > 0;

  // Don't block the entire UI just because template isn't loaded
  // User should still be able to see recruit info and delete them

  const displayName = recruit.first_name && recruit.last_name
    ? `${recruit.first_name} ${recruit.last_name}`
    : recruit.email;
  const initials = recruit.first_name && recruit.last_name
    ? `${recruit.first_name[0]}${recruit.last_name[0]}`.toUpperCase()
    : recruit.email.substring(0, 2).toUpperCase();

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-3">
      {/* Header */}
      <Card className="p-3 mb-2">
        <div className="flex items-start gap-2">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={recruit.profile_photo_url || undefined} alt={displayName} />
            <AvatarFallback>{initials || <User className="h-6 w-6" />}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold truncate">
              {displayName}
            </h2>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-1">
              {recruit.email && (
                <div className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{recruit.email}</span>
                </div>
              )}
              {recruit.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{recruit.phone}</span>
                </div>
              )}
            </div>

            {/* Social Media Links */}
            {(recruit.instagram_url || recruit.linkedin_url) && (
              <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                {recruit.instagram_url && (
                  <a
                    href={recruit.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <Instagram className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">@{recruit.instagramusername || 'IG'}</span>
                  </a>
                )}
                {recruit.linkedin_url && (
                  <a
                    href={recruit.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <Linkedin className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{recruit.linkedinusername || 'LI'}</span>
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="secondary" className={`text-xs ${recruit.onboarding_status ? ONBOARDING_STATUS_COLORS[recruit.onboarding_status] : ONBOARDING_STATUS_COLORS.interview_1}`}>
                {recruit.onboarding_status?.replace(/_/g, ' ') || 'Interview 1'}
              </Badge>
              {currentPhase && currentPhase.status === 'blocked' && (
                <Badge variant="destructive" className="text-xs">
                  Blocked
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - Always show delete, conditionally show pipeline actions */}
        {/* Show actions if: user is upline, user is admin, or user has permission */}
        {(isUpline || currentUserProfile?.is_admin) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            {/* Pipeline actions - only show if pipeline is initialized */}
            {hasPipelineProgress ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAdvancePhase}
                  disabled={!currentPhase || currentPhase?.status === 'blocked'}
                  className="text-xs h-7"
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Advance
                </Button>
                {currentPhase?.status === 'blocked' ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleUnblockPhase}
                    className="text-xs h-7"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unblock
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBlockPhase}
                    disabled={!currentPhase}
                    className="text-xs h-7"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Block
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleInitializeProgress}
                disabled={initializeProgress.isPending}
                className="text-xs h-7"
              >
                {initializeProgress.isPending ? 'Initializing...' : 'Initialize Pipeline'}
              </Button>
            )}
            <div className="flex-1" />
            {/* Delete button - but prevent self-deletion */}
            {currentUserId !== recruit.id ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-xs h-7"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                disabled
                className="text-xs h-7"
                title="You cannot delete yourself"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-2 w-full flex overflow-x-auto">
          <TabsTrigger value="progress" className="text-xs px-2">Progress</TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs px-2">Checklist</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs px-2">
            Docs{documents && documents.length > 0 && ` (${documents.length})`}
          </TabsTrigger>
          <TabsTrigger value="emails" className="text-xs px-2">
            Email{emails && emails.length > 0 && ` (${emails.length})`}
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs px-2">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          {hasPipelineProgress && template ? (
            <PhaseTimeline
              phaseProgress={phaseProgress}
              phases={(template.phases || []) as any}
              onPhaseClick={handlePhaseClick}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No pipeline progress initialized for this recruit.</p>
              {isUpline && (
                <Button
                  size="sm"
                  onClick={handleInitializeProgress}
                  disabled={initializeProgress.isPending}
                >
                  {initializeProgress.isPending ? 'Initializing...' : 'Initialize Pipeline'}
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          {hasPipelineProgress && template ? (
            (() => {
              // Find the phase to display (selected or current)
              const targetPhaseId = selectedPhaseId || currentPhase?.phase_id;
              const targetPhase = template.phases?.find((p: any) => p.id === targetPhaseId);
              const targetChecklistItems = targetPhase?.checklist_items;

              if (!targetChecklistItems || targetChecklistItems.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedPhaseId ? 'No checklist items for selected phase' : 'No current phase or checklist items'}
                  </div>
                );
              }

              return (
                <PhaseChecklist
                  userId={recruit.id}
                  checklistItems={targetChecklistItems}
                  checklistProgress={checklistProgress || []}
                  isUpline={isUpline}
                  currentUserId={currentUserId}
                  currentPhaseId={currentPhase?.phase_id}
                  viewedPhaseId={targetPhaseId}
                  isAdmin={currentUserProfile?.is_admin || false}
                  onPhaseComplete={() => setActiveTab('progress')}
                />
              );
            })()
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Pipeline not initialized. Initialize pipeline to view checklist items.
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentManager
            userId={recruit.id}
            documents={documents}
            isUpline={isUpline}
            currentUserId={currentUserId}
          />
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          <EmailManager
            recruitId={recruit.id}
            recruitEmail={recruit.email}
            recruitName={displayName}
            emails={emails}
            isUpline={isUpline}
            currentUserId={currentUserId}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {activityLog && activityLog.length > 0 ? (
            <div className="space-y-2">
              {activityLog.map((activity) => (
                <Card key={activity.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{activity.action_type.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                      {activity.details && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(activity.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No activity logged yet</div>
          )}
        </TabsContent>
      </Tabs>

      <DeleteRecruitDialogOptimized
        recruit={recruit}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
