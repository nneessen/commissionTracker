// src/features/recruiting/components/RecruitDetailPanel.tsx

import React, { useState } from 'react';
import { UserProfile } from '@/types/hierarchy.types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Mail,
  Phone,
  FileText,
  Activity,
  ArrowRight,
  AlertCircle,
  User,
} from 'lucide-react';
import { PhaseTimeline } from './PhaseTimeline';
import { PhaseChecklist } from './PhaseChecklist';
import {
  useRecruitPhaseProgress,
  useCurrentPhase,
  useChecklistProgress,
  useAdvancePhase,
  useBlockPhase,
} from '../hooks/useRecruitProgress';
import { useActiveTemplate } from '../hooks/usePipeline';
import { useRecruitDocuments } from '../hooks/useRecruitDocuments';
import { useRecruitEmails } from '../hooks/useRecruitEmails';
import { useRecruitActivityLog } from '../hooks/useRecruitActivity';
import { ONBOARDING_STATUS_COLORS } from '@/types/recruiting';

interface RecruitDetailPanelProps {
  recruit: UserProfile;
  currentUserId?: string;
  isUpline?: boolean;
}

export function RecruitDetailPanel({ recruit, currentUserId, isUpline = false }: RecruitDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('progress');

  // Fetch recruit's progress data
  const { data: phaseProgress, isLoading: progressLoading } = useRecruitPhaseProgress(recruit.id);
  const { data: currentPhase, isLoading: currentPhaseLoading } = useCurrentPhase(recruit.id);
  const { data: template, isLoading: templateLoading } = useActiveTemplate();
  const { data: checklistProgress, isLoading: checklistLoading } = useChecklistProgress(
    recruit.id,
    currentPhase?.phase_id
  );
  const { data: documents } = useRecruitDocuments(recruit.id);
  const { data: emails } = useRecruitEmails(recruit.id);
  const { data: activityLog } = useRecruitActivityLog(recruit.id);

  // Mutations
  const advancePhase = useAdvancePhase();
  const blockPhase = useBlockPhase();

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

  if (!phaseProgress || !template) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Unable to load recruit details</p>
      </div>
    );
  }

  const initials = `${recruit.first_name?.[0] || ''}${recruit.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <Card className="p-6 mb-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={recruit.profile_photo_url || undefined} alt={`${recruit.first_name} ${recruit.last_name}`} />
            <AvatarFallback>{initials || <User className="h-8 w-8" />}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">
              {recruit.first_name} {recruit.last_name}
            </h2>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              {recruit.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span>{recruit.email}</span>
                </div>
              )}
              {recruit.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>{recruit.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={recruit.onboarding_status ? ONBOARDING_STATUS_COLORS[recruit.onboarding_status] : ONBOARDING_STATUS_COLORS.lead}>
                {recruit.onboarding_status || 'lead'}
              </Badge>
              {currentPhase && 'phase' in currentPhase && (
                <Badge variant="outline">
                  {(currentPhase.phase as { phase_name?: string })?.phase_name || 'Unknown Phase'}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {isUpline && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAdvancePhase}
                disabled={!currentPhase || currentPhase.status === 'blocked'}
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                Advance Phase
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBlockPhase}
                disabled={!currentPhase || currentPhase.status === 'blocked'}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Mark Blocked
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="checklist">Current Checklist</TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {documents && documents.length > 0 && ` (${documents.length})`}
          </TabsTrigger>
          <TabsTrigger value="emails">
            Emails
            {emails && emails.length > 0 && ` (${emails.length})`}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <PhaseTimeline
            phaseProgress={phaseProgress}
            phases={(template.phases || []) as any}
          />
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          {currentPhase && 'phase' in currentPhase && (currentPhase.phase as { checklist_items?: any[] })?.checklist_items ? (
            <PhaseChecklist
              userId={recruit.id}
              checklistItems={(currentPhase.phase as { checklist_items: any[] }).checklist_items}
              checklistProgress={checklistProgress || []}
              isUpline={isUpline}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No current phase or checklist items
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.document_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.document_type} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{doc.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No documents uploaded yet</div>
          )}
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          {emails && emails.length > 0 ? (
            <div className="space-y-2">
              {emails.map((email) => (
                <Card key={email.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{email.subject}</p>
                    <Badge variant="secondary">{email.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sent {email.sent_at ? new Date(email.sent_at).toLocaleDateString() : 'Not sent'}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No emails sent yet</div>
          )}
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
    </div>
  );
}
