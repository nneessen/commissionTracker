// src/features/recruiting/pages/MyRecruitingPipeline.tsx

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/base/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Phone,
  Upload,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useRecruitPhaseProgress,
  useCurrentPhase,
  useChecklistProgress,
} from '../hooks/useRecruitProgress';
import { useActiveTemplate } from '../hooks/usePipeline';
import { PhaseChecklist } from '../components/PhaseChecklist';
import { DocumentManager } from '../components/DocumentManager';
import { useRecruitDocuments } from '../hooks/useRecruitDocuments';
import type { UserProfile } from '@/types/hierarchy.types';

const PHASE_NAMES = [
  'Interview 1',
  'Zoom Interview',
  'Pre-Licensing',
  'Exam',
  'NPN Received',
  'Contracting',
  'Bootcamp',
];

export function MyRecruitingPipeline() {
  const { user } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fetch current user's profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  // Fetch upline/trainer info
  const { data: upline } = useQuery<UserProfile | null>({
    queryKey: ['upline', profile?.upline_id],
    queryFn: async () => {
      if (!profile?.upline_id) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, phone, profile_photo_url')
        .eq('id', profile.upline_id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!profile?.upline_id,
  });

  // Fetch phase progress
  const { data: phaseProgress } = useRecruitPhaseProgress(profile?.id);
  const { data: currentPhase } = useCurrentPhase(profile?.id);
  const { data: template } = useActiveTemplate();
  const { data: checklistProgress } = useChecklistProgress(
    profile?.id,
    currentPhase?.phase_id
  );
  const { data: documents } = useRecruitDocuments(profile?.id);

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!phaseProgress || phaseProgress.length === 0) return 0;
    const completed = phaseProgress.filter((p) => p.status === 'completed').length;
    return Math.round((completed / phaseProgress.length) * 100);
  };

  // Handle photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileName = `${user.id}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_photo_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      window.location.reload();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-xs">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground text-xs">Failed to load profile. Please refresh.</p>
        </div>
      </div>
    );
  }

  const progressPercentage = calculateProgress();
  const initials = profile.first_name && profile.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : profile.email.substring(0, 2).toUpperCase();

  // Get current phase checklist items
  const currentPhaseData = template?.phases?.find((p: any) => p.id === currentPhase?.phase_id);
  const currentChecklistItems = currentPhaseData?.checklist_items || [];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/10">
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile.profile_photo_url || undefined} alt={profile.first_name || 'User'} />
            <AvatarFallback className="text-xs font-mono">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono truncate">
              {profile.email} · {profile.phone || 'No phone'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
            {progressPercentage}% Complete
          </Badge>
          <label htmlFor="photo-upload">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] cursor-pointer"
              disabled={uploadingPhoto}
              asChild
            >
              <span>
                <Upload className="h-3 w-3 mr-1" />
                {uploadingPhoto ? 'Uploading...' : 'Photo'}
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

      {/* Two-Column Grid Layout */}
      <div className="flex-1 grid grid-cols-3 gap-2 p-2 overflow-hidden">
        {/* Left Column - Current Phase & Checklist */}
        <div className="col-span-2 space-y-2 overflow-auto">
          {/* Current Phase Checklist */}
          {currentPhase && template ? (
            <div className="border rounded-sm p-2 bg-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground font-mono">
                  Current Phase: {currentPhaseData?.phase_name || 'Unknown'}
                </h3>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 font-mono">
                  {currentChecklistItems.length > 0
                    ? `${checklistProgress?.filter(p => p.status === 'completed').length || 0}/${currentChecklistItems.length}`
                    : 'No items'}
                </Badge>
              </div>

              {currentChecklistItems.length > 0 ? (
                <PhaseChecklist
                  userId={profile.id}
                  checklistItems={currentChecklistItems}
                  checklistProgress={checklistProgress || []}
                  isUpline={false}
                  currentUserId={profile.id}
                />
              ) : (
                <p className="text-xs text-muted-foreground font-mono py-4 text-center">
                  No checklist items for this phase
                </p>
              )}

              {currentPhase.notes && (
                <div className="mt-2 p-2 bg-muted/50 rounded-sm">
                  <p className="text-[10px] text-muted-foreground font-mono">{currentPhase.notes}</p>
                </div>
              )}

              {currentPhase.status === 'blocked' && currentPhase.blocked_reason && (
                <div className="mt-2 p-2 bg-destructive/10 rounded-sm border border-destructive/20">
                  <p className="text-[10px] text-destructive font-mono">
                    <strong>Blocked:</strong> {currentPhase.blocked_reason}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-sm p-4 bg-card text-center">
              <p className="text-xs text-muted-foreground font-mono">No active phase</p>
            </div>
          )}

          {/* Phase Progress Timeline */}
          <div className="border rounded-sm p-2 bg-card">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground font-mono mb-2">
              Onboarding Progress
            </h3>
            <div className="space-y-1">
              {phaseProgress?.map((phase, index) => {
                const isCompleted = phase.status === 'completed';
                const isInProgress = phase.status === 'in_progress';
                const isBlocked = phase.status === 'blocked';

                return (
                  <div key={phase.id} className="flex items-center gap-2 p-1 hover:bg-muted/30 rounded-sm transition-colors">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : isInProgress ? (
                      <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    ) : isBlocked ? (
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-medium truncate">
                        {PHASE_NAMES[index] || `Phase ${index + 1}`}
                      </p>
                      {phase.started_at && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Started {format(new Date(phase.started_at), 'MMM d')}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={isCompleted ? 'default' : isInProgress ? 'secondary' : 'outline'}
                      className="text-[10px] px-1 py-0 font-mono capitalize"
                    >
                      {phase.status.replace('_', ' ')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Documents & Upline */}
        <div className="space-y-2 overflow-auto">
          {/* Documents Section */}
          <div className="border rounded-sm p-2 bg-card">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground font-mono mb-2">
              Required Documents
            </h3>
            <DocumentManager
              userId={profile.id}
              documents={documents}
              isUpline={false}
              currentUserId={profile.id}
            />
          </div>

          {/* Upline Contact */}
          {upline ? (
            <div className="border rounded-sm p-2 bg-card">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground font-mono mb-2">
                Your Trainer
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={upline.profile_photo_url || undefined} alt={upline.first_name || 'Trainer'} />
                    <AvatarFallback className="text-[10px] font-mono">
                      {upline.first_name?.[0]}
                      {upline.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold font-mono truncate">
                      {upline.first_name} {upline.last_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate flex items-center gap-1">
                      <Mail className="h-2.5 w-2.5" />
                      {upline.email}
                    </p>
                    {upline.phone && (
                      <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />
                        {upline.phone}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-6 text-[10px] font-mono"
                  asChild
                >
                  <a href={`mailto:${upline.email}`}>
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Contact Trainer
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-sm p-2 bg-card">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground font-mono mb-2">
                Your Trainer
              </h3>
              <p className="text-[10px] text-muted-foreground font-mono text-center py-4">
                No trainer assigned yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
